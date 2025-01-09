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
      return {}; // all time
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

// Get statistics
router.get('/',
  passport.authenticate('jwt', { session: false }),
  async (req, res, next) => {
    try {
      const { trainer, training, dateRange, day } = req.query;
      
      // Build query
      const query = {
        status: 'completed',
        date: getDateFilter(dateRange)
      };
      
      if (trainer !== 'all') {
        query.createdBy = trainer;
      }
      
      if (training !== 'all') {
        query.templateId = training;
      }

      // Fetch completed schedules
      const schedules = await Schedule.find(query)
        .populate('createdBy', 'firstName lastName email')
        .populate('templateId', 'name days');

      // Get all templates for the filter
      const templates = await Template.find({});

      // Get all trainers
      const trainers = await User.find({ role: { $in: ['trainer', 'admin'] } }, 'firstName lastName email');

      // Process schedules
      const statistics = {
        adherence: [],
        durations: [],
        daySpecificStats: {},
        onTimeStartRate: 0,
        totalTrainingDays: schedules.length,
        mostDelayedActivities: [],
        mostEfficientActivities: [],
        trainers: trainers.map(t => ({
          _id: t._id,
          name: `${t.firstName} ${t.lastName}`,
          email: t.email
        })),
        trainings: templates.map(t => ({
          _id: t._id,
          name: t.name,
          days: t.days
        }))
      };

      let totalActivities = 0;
      let onTimeStarts = 0;
      const activityStats = new Map();
      const dayStats = new Map();

      schedules.forEach(schedule => {
        const dayKey = `${schedule.templateId?._id}-${schedule.selectedDay}`;
        if (!dayStats.has(dayKey)) {
          dayStats.set(dayKey, {
            templateId: schedule.templateId?._id,
            day: schedule.selectedDay,
            activities: new Map()
          });
        }
        
        schedule.activities.forEach(activity => {
          totalActivities++;
          
          // Track activity stats
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
          
          // Check start time adherence
          if (activity.actualStartTime) {
            const scheduledStart = parseISO(`${schedule.date.toISOString().split('T')[0]}T${activity.startTime}`);
            const actualStart = new Date(activity.actualStartTime);
            
            // Consider on time if started at scheduled time or before
            if (actualStart <= scheduledStart) {
              stats.onTime++;
              onTimeStarts++;
            } else {
              stats.delayed++;
            }
            
            // Calculate time variance if we have both start and end times
            if (activity.actualEndTime) {
              const actualDuration = differenceInMinutes(
                new Date(activity.actualEndTime),
                new Date(activity.actualStartTime)
              );
              const variance = actualDuration - activity.duration;
              stats.totalTimeVariance += variance;

              // Track day-specific stats
              const dayActivities = dayStats.get(dayKey).activities;
              if (!dayActivities.has(activity.name)) {
                dayActivities.set(activity.name, {
                  timeVariances: [],
                  scheduledDuration: activity.duration
                });
              }
              dayActivities.get(activity.name).timeVariances.push(variance);
            }
          }
        });
      });

      // Calculate adherence statistics
      activityStats.forEach((stats, name) => {
        statistics.adherence.push({
          activity: name,
          onTime: formatPercentage((stats.onTime / stats.count) * 100),
          delayed: formatPercentage((stats.delayed / stats.count) * 100),
          averageVariance: formatDuration(stats.totalTimeVariance / stats.count)
        });
      });

      // Calculate day-specific statistics
      dayStats.forEach((dayData, key) => {
        const dayStats = {
          activities: []
        };

        dayData.activities.forEach((stats, activityName) => {
          const averageVariance = stats.timeVariances.reduce((a, b) => a + b, 0) / stats.timeVariances.length;
          dayStats.activities.push({
            name: activityName,
            scheduledDuration: formatDuration(stats.scheduledDuration),
            averageActualDuration: formatDuration(stats.scheduledDuration + averageVariance),
            averageVariance: formatDuration(averageVariance)
          });
        });

        statistics.daySpecificStats[key] = dayStats;
      });

      // Calculate most delayed and most efficient activities
      const delayedActivities = [...activityStats.entries()]
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
      statistics.onTimeStartRate = formatPercentage((onTimeStarts / totalActivities) * 100);

      res.json(statistics);
    } catch (error) {
      logger.error('Error fetching statistics:', error);
      next(error);
    }
  }
);

module.exports = router; 