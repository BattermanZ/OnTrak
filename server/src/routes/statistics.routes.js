const express = require('express');
const passport = require('passport');
const Schedule = require('../models/schedule.model');
const Template = require('../models/template.model');
const User = require('../models/user.model');
const logger = require('../config/logger');
const { startOfWeek, startOfMonth, startOfYear, parseISO, differenceInMinutes } = require('date-fns');

const router = express.Router();

// Helper function to get date filter based on range
const getDateFilter = (range) => {
  const now = new Date();
  switch (range) {
    case 'week':
      return { $gte: startOfWeek(now) };
    case 'month':
      return { $gte: startOfMonth(now) };
    case 'year':
      return { $gte: startOfYear(now) };
    case 'all':
      return null;
    default:
      logger.warn('Invalid date range provided', { range });
      return null;
  }
};

// Helper function to round number and add unit
const formatDuration = (minutes) => {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h${remainingMinutes}min`;
  }
  return `${Math.round(minutes)}min`;
};

const formatPercentage = (value) => `${Math.round(value)}%`;

// Process schedules to get statistics
const processSchedules = (schedules, trainerId = null) => {
  try {
    if (!Array.isArray(schedules)) {
      throw new Error('Invalid schedules data: expected an array');
    }

    // Filter schedules by trainer if specified
    const filteredSchedules = trainerId 
      ? schedules.filter(s => s.createdBy?._id?.toString() === trainerId)
      : schedules;

    // Initialize statistics object with default values
    const statistics = {
      totalTrainingDays: filteredSchedules.length,
      adherence: 0,
      onTimeStartRate: 0,
      averageDelay: 0,
      daySpecificStats: {},
      mostDelayedActivities: [],
      mostEfficientActivities: []
    };

    if (filteredSchedules.length === 0) {
      return statistics;
    }

    // Calculate adherence and timing statistics
    let totalActivities = 0;
    let completedOnTime = 0;
    let totalDelay = 0;
    const activityStats = new Map();

    filteredSchedules.forEach(schedule => {
      try {
        if (!schedule.activities || !Array.isArray(schedule.activities)) {
          logger.warn('Invalid schedule activities', { scheduleId: schedule._id });
          return;
        }

        schedule.activities.forEach(activity => {
          try {
            if (!activity.name || !activity.startTime || !activity.actualStartTime) {
              logger.warn('Invalid activity data', { 
                scheduleId: schedule._id,
                activityId: activity._id 
              });
              return;
            }

            totalActivities++;

            // Calculate delay
            const plannedStart = activity.startTime;
            const actualStart = activity.actualStartTime;
            const delay = differenceInMinutes(
              new Date(actualStart),
              parseISO(`${schedule.startDate.toISOString().split('T')[0]}T${plannedStart}:00`)
            );

            // Update activity statistics
            const key = activity.name;
            if (!activityStats.has(key)) {
              activityStats.set(key, { totalDelay: 0, count: 0, onTimeCount: 0 });
            }
            const stats = activityStats.get(key);
            stats.totalDelay += delay;
            stats.count++;
            
            if (delay <= 5) { // Consider 5 minutes as the threshold for "on time"
              completedOnTime++;
              stats.onTimeCount++;
            }

            totalDelay += Math.max(0, delay);

            // Update day-specific stats
            const day = schedule.selectedDay;
            if (day) {
              if (!statistics.daySpecificStats[day]) {
                statistics.daySpecificStats[day] = {
                  totalActivities: 0,
                  completedOnTime: 0,
                  averageDelay: 0
                };
              }
              statistics.daySpecificStats[day].totalActivities++;
              if (delay <= 5) {
                statistics.daySpecificStats[day].completedOnTime++;
              }
              statistics.daySpecificStats[day].averageDelay = 
                (statistics.daySpecificStats[day].averageDelay * 
                  (statistics.daySpecificStats[day].totalActivities - 1) + delay) / 
                statistics.daySpecificStats[day].totalActivities;
            }
          } catch (error) {
            logger.error('Error processing activity:', {
              error: error.message,
              scheduleId: schedule._id,
              activityId: activity._id
            });
          }
        });
      } catch (error) {
        logger.error('Error processing schedule:', {
          error: error.message,
          scheduleId: schedule._id
        });
      }
    });

    // Calculate final statistics
    if (totalActivities > 0) {
      statistics.adherence = formatPercentage((completedOnTime / totalActivities) * 100);
      statistics.onTimeStartRate = formatPercentage((completedOnTime / totalActivities) * 100);
      statistics.averageDelay = formatDuration(totalDelay / totalActivities);
    }

    // Sort and format activity statistics
    const activityArray = Array.from(activityStats.entries()).map(([name, stats]) => ({
      name,
      averageDelay: stats.totalDelay / stats.count,
      onTimeRate: (stats.onTimeCount / stats.count) * 100
    }));

    statistics.mostDelayedActivities = activityArray
      .sort((a, b) => b.averageDelay - a.averageDelay)
      .slice(0, 5)
      .map(a => ({
        name: a.name,
        averageDelay: formatDuration(a.averageDelay)
      }));

    statistics.mostEfficientActivities = activityArray
      .sort((a, b) => b.onTimeRate - a.onTimeRate)
      .slice(0, 5)
      .map(a => ({
        name: a.name,
        onTimeRate: formatPercentage(a.onTimeRate)
      }));

    // Format day-specific stats
    Object.keys(statistics.daySpecificStats).forEach(day => {
      const dayStats = statistics.daySpecificStats[day];
      dayStats.adherence = formatPercentage((dayStats.completedOnTime / dayStats.totalActivities) * 100);
      dayStats.averageDelay = formatDuration(dayStats.averageDelay);
      delete dayStats.totalActivities;
      delete dayStats.completedOnTime;
    });

    return statistics;
  } catch (error) {
    logger.error('Error in processSchedules:', {
      error: error.message,
      stack: error.stack
    });
    throw new Error(`Failed to process statistics: ${error.message}`);
  }
};

// Get statistics with error handling and timeouts
router.get('/',
  passport.authenticate('jwt', { session: false }),
  async (req, res, next) => {
    let templates = [];
    let trainers = [];
    let schedules = [];

    try {
      logger.debug('Fetching statistics', { 
        filters: req.query,
        userId: req.user._id 
      });

      // Build base query
      const baseQuery = { status: 'completed' };

      // Add trainer filter if specified
      if (req.query.trainer) {
        baseQuery.createdBy = req.query.trainer;
      }

      // Add training filter if specified
      if (req.query.training) {
        baseQuery.templateId = req.query.training;
      }

      // Add day filter if specified
      if (req.query.day) {
        baseQuery.selectedDay = parseInt(req.query.day);
      }

      // Add date filter if specified
      const dateFilter = getDateFilter(req.query.dateRange);
      if (dateFilter !== null) {
        baseQuery.date = dateFilter;
      }

      // Fetch templates with timeout
      try {
        templates = await Promise.race([
          Template.find(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Template fetch timeout')), 5000)
          )
        ]);
      } catch (error) {
        logger.error('Error fetching templates:', error);
        throw new Error('Failed to fetch templates: ' + error.message);
      }

      // Fetch trainers with timeout
      try {
        trainers = await Promise.race([
          User.find({ role: 'trainer' }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Trainer fetch timeout')), 5000)
          )
        ]);
      } catch (error) {
        logger.error('Error fetching trainers:', error);
        throw new Error('Failed to fetch trainers: ' + error.message);
      }

      // Fetch schedules with timeout
      try {
        schedules = await Promise.race([
          Schedule.find(baseQuery)
            .populate('templateId')
            .populate('createdBy'),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Schedule fetch timeout')), 5000)
          )
        ]);
      } catch (error) {
        logger.error('Error fetching schedules:', error);
        throw new Error('Failed to fetch schedules: ' + error.message);
      }

      // Process statistics with error handling
      let statistics;
      try {
        statistics = processSchedules(schedules, req.query.trainer);
      } catch (error) {
        logger.error('Error processing statistics:', error);
        throw new Error('Failed to process statistics: ' + error.message);
      }

      // Add metadata
      try {
        statistics.metadata = {
          templates: templates.map(t => ({
            _id: t._id,
            name: t.name
          })),
          trainers: trainers.map(t => ({
            _id: t._id,
            name: `${t.firstName} ${t.lastName}`
          }))
        };
      } catch (error) {
        logger.error('Error adding metadata:', error);
        // Don't throw here, metadata is not critical
        statistics.metadata = { templates: [], trainers: [] };
      }

      logger.debug('Statistics processed successfully', {
        userId: req.user._id,
        scheduleCount: schedules.length
      });

      res.json(statistics);
    } catch (error) {
      logger.error('Error in statistics route:', {
        error: error.message,
        stack: error.stack,
        userId: req.user._id,
        query: req.query
      });
      
      // Clean up any partial results
      templates = [];
      trainers = [];
      schedules = [];
      
      next(error);
    }
  }
);

module.exports = router; 