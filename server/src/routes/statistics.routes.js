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
    default:
      return undefined; // Remove date filter for 'all' case
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
    const statistics = {
      adherence: [],
      durations: [],
      daySpecificStats: {},
      onTimeStartRate: 0,
      totalTrainingDays: schedules?.length || 0,
      mostDelayedActivities: [],
      mostEfficientActivities: []
    };

    let totalActivities = 0;
    let onTimeStarts = 0;
    const activityStats = new Map();
    const dayStats = new Map();

    // Filter schedules by trainer if specified
    const filteredSchedules = trainerId && schedules
      ? schedules.filter(s => s?.createdBy?._id?.toString() === trainerId)
      : schedules || [];

    filteredSchedules.forEach(schedule => {
      if (!schedule?.templateId?._id || !schedule?.selectedDay) {
        logger.warn('Invalid schedule data', { schedule });
        return;
      }

      const dayKey = `${schedule.templateId._id}-${schedule.selectedDay}`;
      if (!dayStats.has(dayKey)) {
        dayStats.set(dayKey, {
          templateId: schedule.templateId._id,
          day: schedule.selectedDay,
          activities: new Map()
        });
      }
      
      if (!Array.isArray(schedule.activities)) {
        logger.warn('Schedule activities is not an array', { schedule });
        return;
      }

      schedule.activities.forEach(activity => {
        if (!activity?.name) {
          logger.warn('Invalid activity data', { activity });
          return;
        }

        totalActivities++;
        
        if (!activityStats.has(activity.name)) {
          activityStats.set(activity.name, {
            onTime: 0,
            delayed: 0,
            totalTimeVariance: 0,
            count: 0
          });
        }
        const stats = activityStats.get(activity.name);
        stats.count++;
        
        if (activity.actualStartTime && activity.startTime && schedule.date) {
          try {
            const scheduledStart = parseISO(`${schedule.date.toISOString().split('T')[0]}T${activity.startTime}`);
            const actualStart = new Date(activity.actualStartTime);
            
            if (actualStart <= scheduledStart) {
              stats.onTime++;
              onTimeStarts++;
            } else {
              stats.delayed++;
            }
            
            if (activity.actualEndTime && activity.duration) {
              const actualDuration = differenceInMinutes(
                new Date(activity.actualEndTime),
                new Date(activity.actualStartTime)
              );
              const variance = actualDuration - activity.duration;
              stats.totalTimeVariance += variance;

              const dayActivities = dayStats.get(dayKey).activities;
              if (!dayActivities.has(activity.name)) {
                dayActivities.set(activity.name, {
                  timeVariances: [],
                  scheduledDuration: activity.duration
                });
              }
              dayActivities.get(activity.name).timeVariances.push(variance);
            }
          } catch (error) {
            logger.error('Error processing activity times', { error, activity });
          }
        }
      });
    });

    // Calculate adherence statistics
    activityStats.forEach((stats, name) => {
      if (stats.count > 0) {
        statistics.adherence.push({
          activity: name,
          onTime: formatPercentage((stats.onTime / stats.count) * 100),
          delayed: formatPercentage((stats.delayed / stats.count) * 100),
          averageVariance: formatDuration(stats.totalTimeVariance / stats.count)
        });
      }
    });

    // Calculate day-specific statistics
    dayStats.forEach((dayData, key) => {
      const dayStats = {
        activities: []
      };

      dayData.activities.forEach((stats, activityName) => {
        if (stats.timeVariances.length > 0) {
          const averageVariance = stats.timeVariances.reduce((a, b) => a + b, 0) / stats.timeVariances.length;
          dayStats.activities.push({
            name: activityName,
            scheduledDuration: formatDuration(stats.scheduledDuration),
            averageActualDuration: formatDuration(stats.scheduledDuration + averageVariance),
            averageVariance: formatDuration(averageVariance)
          });
        }
      });

      statistics.daySpecificStats[key] = dayStats;
    });

    // Calculate most delayed and most efficient activities
    if (activityStats.size > 0) {
      const delayedActivities = [...activityStats.entries()]
        .filter(([_, stats]) => stats.count > 0)
        .map(([name, stats]) => ({
          name,
          averageVariance: stats.totalTimeVariance / stats.count
        }))
        .sort((a, b) => b.averageVariance - a.averageVariance)
        .slice(0, 5)
        .map(activity => ({
          name: activity.name,
          averageDelay: formatDuration(Math.abs(activity.averageVariance))
        }));

      const efficientActivities = [...activityStats.entries()]
        .filter(([_, stats]) => stats.count > 0)
        .map(([name, stats]) => ({
          name,
          averageVariance: stats.totalTimeVariance / stats.count
        }))
        .sort((a, b) => a.averageVariance - b.averageVariance)
        .slice(0, 5)
        .map(activity => ({
          name: activity.name,
          averageTimeSaved: formatDuration(Math.abs(activity.averageVariance))
        }));

      statistics.mostDelayedActivities = delayedActivities;
      statistics.mostEfficientActivities = efficientActivities;
    }

    statistics.onTimeStartRate = totalActivities > 0 
      ? formatPercentage((onTimeStarts / totalActivities) * 100)
      : '0%';

    return statistics;
  } catch (error) {
    logger.error('Error processing schedules:', error);
    throw error;
  }
};

// Get statistics with error handling and timeouts
router.get('/',
  passport.authenticate('jwt', { session: false }),
  async (req, res, next) => {
    const startTime = Date.now();
    try {
      const { trainer, training, dateRange } = req.query;
      
      logger.debug('Statistics request received', { trainer, training, dateRange });
      
      // Build base query
      const baseQuery = {
        status: 'completed'
      };

      // Add date filter if specified
      const dateFilter = getDateFilter(dateRange);
      if (dateFilter) {
        baseQuery.date = dateFilter;
      }

      if (training !== 'all') {
        baseQuery.templateId = training;
      }

      // Get all templates and trainers first
      let templates, trainers;
      try {
        [templates, trainers] = await Promise.all([
          Template.find({}).lean().maxTimeMS(5000),
          User.find({ role: { $in: ['trainer', 'admin'] } }, 'firstName lastName email').lean().maxTimeMS(5000)
        ]);
      } catch (error) {
        logger.error('Error fetching templates and trainers:', error);
        throw new Error('Failed to fetch templates and trainers');
      }

      if (!templates || !trainers) {
        throw new Error('Failed to fetch required data');
      }

      logger.debug('Retrieved templates and trainers', { 
        templateCount: templates.length, 
        trainerCount: trainers.length 
      });

      // Get all schedules in one query
      let schedules;
      try {
        schedules = await Schedule.find(baseQuery)
          .populate('createdBy', 'firstName lastName email')
          .populate('templateId', 'name days')
          .lean()
          .maxTimeMS(30000);
      } catch (error) {
        logger.error('Error fetching schedules:', error);
        throw new Error('Failed to fetch schedules');
      }

      if (!schedules) {
        throw new Error('Failed to fetch schedules');
      }

      logger.debug('Retrieved schedules', { count: schedules.length });

      // Process statistics based on trainer filter
      let statistics;
      try {
        statistics = trainer === 'all'
          ? processSchedules(schedules)
          : processSchedules(schedules, trainer);
      } catch (error) {
        logger.error('Error processing statistics:', error);
        throw new Error('Failed to process statistics');
      }

      if (!statistics) {
        throw new Error('Failed to generate statistics');
      }

      // Add metadata
      try {
        statistics.trainers = trainers.map(t => ({
          _id: t._id,
          name: `${t.firstName} ${t.lastName}`,
          email: t.email
        }));
        statistics.trainings = templates.map(t => ({
          _id: t._id,
          name: t.name,
          days: t.days
        }));
      } catch (error) {
        logger.error('Error adding metadata:', error);
        throw new Error('Failed to add metadata to statistics');
      }

      const duration = Date.now() - startTime;
      logger.debug('Statistics processed successfully', { 
        duration,
        scheduleCount: schedules.length,
        trainer,
        dateRange 
      });

      res.json(statistics);
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Error processing statistics:', { 
        error: error.message,
        duration,
        stack: error.stack
      });
      res.status(500).json({
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

module.exports = router; 