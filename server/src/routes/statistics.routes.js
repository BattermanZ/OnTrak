const express = require('express');
const passport = require('passport');
const Schedule = require('../models/schedule.model');
const Template = require('../models/template.model');
const User = require('../models/user.model');
const logger = require('../config/logger');
const { startOfWeek, startOfMonth, startOfYear, parseISO, differenceInMinutes } = require('date-fns');
const { performance } = require('perf_hooks');
const mongoose = require('mongoose');

const router = express.Router();

// Helper function to get date filter based on range
const getDateFilter = (range) => {
  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  
  switch (range) {
    case 'week':
      return { $gte: oneYearAgo, $lte: oneYearFromNow };
    case 'month':
      return { $gte: oneYearAgo, $lte: oneYearFromNow };
    case 'year':
      return { $gte: oneYearAgo, $lte: oneYearFromNow };
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
const processSchedules = (schedules) => {
  const statistics = {
    adherence: [],
    daySpecificStats: {},
    onTimeStartRate: '0%',
    totalTrainingDays: schedules.length,
    mostDelayedActivities: [],
    mostEfficientActivities: [],
    trainings: [],
    trainers: []
  };

  let totalActivities = 0;
  let onTimeStarts = 0;
  const activityStats = new Map();
  const dayStats = new Map();
  const trainingStats = new Map(); // Track stats per training

  schedules.forEach(schedule => {
    if (!schedule.activities || !Array.isArray(schedule.activities)) {
      logger.warn('Invalid schedule activities', { scheduleId: schedule._id });
      return;
    }

    // Get templateId, handling both populated and unpopulated cases
    const templateId = schedule.templateId?._id || schedule.templateId;
    if (!templateId) {
      logger.warn('Missing templateId in schedule', { scheduleId: schedule._id });
      return;
    }

    // Initialize training stats if not exists
    if (!trainingStats.has(templateId.toString())) {
      trainingStats.set(templateId.toString(), {
        totalVariance: 0,
        activityCount: 0,
        name: schedule.templateId?.name || 'Unknown Training'
      });
    }

    const dayKey = `${templateId}-${schedule.selectedDay}`;
    if (!dayStats.has(dayKey)) {
      dayStats.set(dayKey, {
        templateId: templateId,
        day: schedule.selectedDay,
        activities: new Map(),
        totalVariance: 0,
        activityCount: 0
      });
    }
    
    schedule.activities.forEach(activity => {
      // Skip deleted activities or activities with missing required fields
      if (!activity.name || activity.deleted || !activity.startTime || !activity.duration) {
        logger.debug('Skipping invalid or deleted activity', { 
          scheduleId: schedule._id,
          activity: activity.name,
          deleted: activity.deleted,
          hasStartTime: !!activity.startTime,
          hasDuration: !!activity.duration
        });
        return;
      }

      // Skip activities that are not marked as completed
      if (!activity.completed) {
        logger.debug('Skipping uncompleted activity', {
          scheduleId: schedule._id,
          activity: activity.name
        });
        return;
      }

      // Skip activities that don't have both actual start and end times
      if (!activity.actualStartTime || !activity.actualEndTime) {
        logger.debug('Skipping activity without actual times', {
          scheduleId: schedule._id,
          activity: activity.name,
          hasActualStart: !!activity.actualStartTime,
          hasActualEnd: !!activity.actualEndTime
        });
        return;
      }

      totalActivities++;
      
      if (!activityStats.has(activity.name)) {
        activityStats.set(activity.name, {
          onTime: 0,
          delayed: 0,
          totalTimeVariance: 0,
          totalDuration: 0,
          totalActualDuration: 0,
          count: 0
        });
      }
      const stats = activityStats.get(activity.name);
      stats.count++;
      stats.totalDuration += activity.duration;
      stats.totalActualDuration += differenceInMinutes(
        new Date(activity.actualEndTime),
        new Date(activity.actualStartTime)
      );
      
      try {
        // Calculate scheduled start time
        const scheduledStart = parseISO(`${schedule.date.toISOString().split('T')[0]}T${activity.startTime}`);
        const actualStart = new Date(activity.actualStartTime);
        const startVariance = differenceInMinutes(actualStart, scheduledStart);

        // Calculate duration variance
        const actualDuration = differenceInMinutes(
          new Date(activity.actualEndTime),
          new Date(activity.actualStartTime)
        );
        const scheduledDuration = activity.duration;
        const durationVariance = actualDuration - scheduledDuration;

        // For Training Punctuality Score: early start or within ±10% of scheduled start
        const punctualityThreshold = Math.max(5, scheduledDuration * 0.1);
        if (Math.abs(startVariance) <= punctualityThreshold) {
          onTimeStarts++;
        }

        // For adherence array
        statistics.adherence.push({
          activity: activity.name,
          onTime: Math.abs(startVariance) <= punctualityThreshold ? "1" : "0",
          delayed: Math.abs(startVariance) > punctualityThreshold ? "1" : "0",
          averageVariance: durationVariance.toString()
        });

        // Update activity stats
        stats.totalTimeVariance += durationVariance;
        if (Math.abs(startVariance) <= punctualityThreshold) {
          stats.onTime++;
        } else {
          stats.delayed++;
        }

        // Update day-specific stats
        const dayActivities = dayStats.get(dayKey).activities;
        if (!dayActivities.has(activity.name)) {
          dayActivities.set(activity.name, {
            timeVariances: [],
            scheduledDuration: scheduledDuration,
            totalActualDuration: 0,
            count: 0
          });
        }
        const activityData = dayActivities.get(activity.name);
        activityData.timeVariances.push(durationVariance);
        activityData.totalActualDuration += actualDuration;
        activityData.count++;

        // Update total variance for this day
        const dayData = dayStats.get(dayKey);
        dayData.totalVariance += durationVariance;
        dayData.activityCount++;

        // Update training stats
        const trainingData = trainingStats.get(templateId.toString());
        trainingData.totalVariance += durationVariance;
        trainingData.activityCount++;

      } catch (error) {
        logger.error('Error calculating variance:', {
          error: error.message,
          activity: activity.name,
          scheduleId: schedule._id,
          startTime: activity.startTime,
          actualStartTime: activity.actualStartTime,
          date: schedule.date
        });
      }
    });
  });

  // Calculate statistics from processed data
  if (totalActivities > 0) {
    statistics.onTimeStartRate = `${Math.round((onTimeStarts / totalActivities) * 100)}%`;
  }

  // Convert activity stats to array format
  activityStats.forEach((stats, name) => {
    const averageVariance = stats.count > 0 ? stats.totalTimeVariance / stats.count : 0;
    const averageActualDuration = stats.count > 0 ? stats.totalActualDuration / stats.count : 0;
    const averageScheduledDuration = stats.count > 0 ? stats.totalDuration / stats.count : 0;

    // Add to most delayed/efficient activities
    const averageDelay = averageActualDuration - averageScheduledDuration;
    if (averageDelay > 0) {
      statistics.mostDelayedActivities.push({
        name,
        averageDelay: `${Math.round(averageDelay)}min`,
        variant: 'destructive'
      });
    } else if (averageDelay < 0) {
      statistics.mostEfficientActivities.push({
        name,
        averageTimeSaved: `${Math.round(-averageDelay)}min`,
        variant: 'success'
      });
    }
  });

  // Sort delayed activities by average delay (descending)
  statistics.mostDelayedActivities.sort((a, b) => {
    const delayA = parseInt(a.averageDelay);
    const delayB = parseInt(b.averageDelay);
    return delayB - delayA;
  });

  // Sort efficient activities by average time saved (descending)
  statistics.mostEfficientActivities.sort((a, b) => {
    const savedA = parseInt(a.averageTimeSaved);
    const savedB = parseInt(b.averageTimeSaved);
    return savedB - savedA;
  });

  // Convert day stats to required format
  dayStats.forEach((stats, key) => {
    const daySpecificStats = {
      activities: []
    };

    stats.activities.forEach((activityStats, activityName) => {
      const averageVariance = activityStats.count > 0 ? activityStats.totalVariance / activityStats.count : 0;
      const averageActualDuration = activityStats.count > 0 ? activityStats.totalActualDuration / activityStats.count : 0;
      
      daySpecificStats.activities.push({
        name: activityName,
        scheduledDuration: `${Math.round(activityStats.totalDuration / activityStats.count)}min`,
        averageActualDuration: `${Math.round(averageActualDuration)}min`,
        averageVariance: `${Math.round(averageVariance)}min`
      });
    });

    statistics.daySpecificStats[key] = daySpecificStats;
  });

  // Convert training stats to array format
  trainingStats.forEach((stats, templateId) => {
    const averageVariance = stats.activityCount > 0 ? 
      Math.round(stats.totalVariance / stats.activityCount) : 0;
    
    // Find and update the existing training entry instead of pushing a new one
    const existingTraining = statistics.trainings.find(t => t._id === templateId);
    if (existingTraining) {
      existingTraining.timeVariance = averageVariance;
    } else {
      // If not found (shouldn't happen), add it
      statistics.trainings.push({
        _id: templateId,
        name: stats.name,
        timeVariance: averageVariance
      });
    }
  });

  return statistics;
};

// Helper function to parse duration strings (needed for sorting)
const parseDuration = (durationStr) => {
  const hours = durationStr.match(/(\d+)h/);
  const minutes = durationStr.match(/(\d+)min/);
  let totalMinutes = 0;
  if (hours) totalMinutes += parseInt(hours[1]) * 60;
  if (minutes) totalMinutes += parseInt(minutes[1]);
  return totalMinutes;
};

// Get statistics with error handling and timeouts
router.get('/',
  passport.authenticate('jwt', { session: false }),
  async (req, res, next) => {
    const startTime = performance.now();
    let templates = [];
    let trainers = [];
    let schedules = [];

    try {
      logger.debug('Fetching statistics', { 
        filters: req.query,
        userId: req.user._id 
      });

      // Build base query with optimized fields selection
      const baseQuery = { 
        status: 'completed',
        'activities.completed': true  // Ensure activities are completed
      };

      // Add trainer filter if specified
      if (req.query.trainer && req.query.trainer !== 'all') {
        baseQuery.createdBy = new mongoose.Types.ObjectId(req.query.trainer);
      }

      // Add training filter if specified
      if (req.query.training && req.query.training !== 'all') {
        baseQuery.templateId = new mongoose.Types.ObjectId(req.query.training);
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

      // Add logging to debug query
      logger.debug('Statistics query:', {
        baseQuery,
        trainer: req.query.trainer,
        training: req.query.training,
        dateRange: req.query.dateRange,
        day: req.query.day
      });

      // Initialize default statistics response
      let statistics = {
        totalTrainingDays: 0,
        adherence: [],
        onTimeStartRate: '0%',
        averageDelay: '0min',
        daySpecificStats: {},
        mostDelayedActivities: [],
        mostEfficientActivities: [],
        trainers: [],
        trainings: [],
        metadata: {
          templates: [],
          trainers: []
        }
      };

      // Fetch templates with timeout and field selection
      try {
        templates = await Promise.race([
          Template.find().select('name days').lean().maxTimeMS(5000),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Template fetch timeout')), 5000)
          )
        ]);
        statistics.metadata.templates = templates.map(t => ({
          _id: t._id,
          name: t.name
        }));
        // Initialize trainings with template metadata (don't overwrite)
        statistics.trainings = templates.map(t => ({
          _id: t._id.toString(),  // Convert to string for comparison
          name: t.name,
          days: t.days,
          timeVariance: 0  // Default value
        }));
      } catch (error) {
        logger.error('Error fetching templates:', error);
        // Don't throw, continue with empty templates
      }

      // Fetch trainers with timeout and field selection
      try {
        trainers = await Promise.race([
          User.find({ role: { $in: ['trainer', 'admin'] } }).select('firstName lastName email').lean().maxTimeMS(5000),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Trainer fetch timeout')), 5000)
          )
        ]);
        
        // Map trainers to statistics format
        const trainerStats = trainers.map(t => ({
          _id: t._id,
          name: `${t.firstName} ${t.lastName}`,
          email: t.email,
          totalTrainingDays: 0,
          adherence: [],
          onTimeStartRate: '0%',
          averageDelay: '0min'
        }));

        statistics.metadata.trainers = trainers.map(t => ({
          _id: t._id,
          name: `${t.firstName} ${t.lastName}`
        }));
        statistics.trainers = trainerStats;
      } catch (error) {
        logger.error('Error fetching trainers:', error);
        // Don't throw, continue with empty trainers
      }

      // Fetch schedules with timeout and optimized query
      try {
        const scheduleQuery = Schedule.find(baseQuery)
          .select('activities date selectedDay createdBy templateId status')
          .populate({
            path: 'templateId',
            select: 'name days activities',
            populate: {
              path: 'activities',
              select: 'name startTime duration day'
            }
          })
          .populate('createdBy', 'firstName lastName email role')
          .lean()
          .maxTimeMS(10000);

        schedules = await Promise.race([
          scheduleQuery,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Schedule fetch timeout')), 10000)
          )
        ]);

        // Add detailed logging for schedule data
        logger.debug('Schedules fetched successfully', {
          count: schedules.length,
          query: baseQuery,
          sampleSchedule: schedules[0] ? {
            id: schedules[0]._id,
            activities: schedules[0].activities.length,
            hasDate: !!schedules[0].date,
            hasTemplateId: !!schedules[0].templateId,
            hasCreatedBy: !!schedules[0].createdBy,
            completedActivities: schedules[0].activities.filter(a => a.completed).length,
            templateName: schedules[0].templateId?.name,
            trainerName: schedules[0].createdBy ? `${schedules[0].createdBy.firstName} ${schedules[0].createdBy.lastName}` : null
          } : null
        });

        // Process schedules for each trainer
        if (schedules.length > 0) {
          try {
            // If a specific trainer is selected, only process their schedules
            if (req.query.trainer && req.query.trainer !== 'all') {
              const processedStats = processSchedules(schedules);
              // Update the specific trainer's stats
              const trainerIndex = statistics.trainers.findIndex(t => t._id.toString() === req.query.trainer);
              if (trainerIndex !== -1) {
                statistics.trainers[trainerIndex] = {
                  ...statistics.trainers[trainerIndex],
                  ...processedStats
                };
              }
              // Use the same stats for overall statistics
              statistics = {
                ...statistics,
                ...processedStats
              };
            } else {
              // Process schedules for all trainers
              trainers.forEach(trainer => {
                const trainerSchedules = schedules.filter(s => {
                  const scheduleTrainerId = s.createdBy?._id || s.createdBy;
                  return scheduleTrainerId?.toString() === trainer._id.toString();
                });
                if (trainerSchedules.length > 0) {
                  const processedStats = processSchedules(trainerSchedules);
                  const trainerIndex = statistics.trainers.findIndex(t => t._id.toString() === trainer._id.toString());
                  if (trainerIndex !== -1) {
                    // Calculate total variance for this trainer
                    let totalVariance = 0;
                    let totalActivities = 0;
                    
                    trainerSchedules.forEach(schedule => {
                      schedule.activities.forEach(activity => {
                        if (activity.completed && activity.actualStartTime && activity.actualEndTime) {
                          const actualDuration = differenceInMinutes(
                            new Date(activity.actualEndTime),
                            new Date(activity.actualStartTime)
                          );
                          const scheduledDuration = activity.duration;
                          const variance = actualDuration - scheduledDuration;
                          totalVariance += variance;
                          totalActivities++;
                        }
                      });
                    });
                    
                    statistics.trainers[trainerIndex] = {
                      ...statistics.trainers[trainerIndex],
                      ...processedStats,
                      timeVariance: totalActivities > 0 ? Math.round(totalVariance / totalActivities) : 0
                    };
                  }
                }
              });

              // Calculate overall statistics
              const overallStats = processSchedules(schedules);
              statistics = {
                ...statistics,
                ...overallStats,
                trainers: statistics.trainers // Preserve trainer stats
              };

              // Calculate training-specific statistics
              templates.forEach(template => {
                const templateSchedules = schedules.filter(s => 
                  (s.templateId?._id || s.templateId)?.toString() === template._id.toString()
                );
                
                if (templateSchedules.length > 0) {
                  let totalVariance = 0;
                  let totalActivities = 0;
                  
                  templateSchedules.forEach(schedule => {
                    schedule.activities.forEach(activity => {
                      if (activity.completed && activity.actualStartTime && activity.actualEndTime) {
                        const actualDuration = differenceInMinutes(
                          new Date(activity.actualEndTime),
                          new Date(activity.actualStartTime)
                        );
                        const scheduledDuration = activity.duration;
                        const variance = actualDuration - scheduledDuration;
                        totalVariance += variance;
                        totalActivities++;
                      }
                    });
                  });
                  
                  // Update training variance in statistics
                  const trainingIndex = statistics.trainings.findIndex(t => t._id.toString() === template._id.toString());
                  if (trainingIndex !== -1) {
                    statistics.trainings[trainingIndex] = {
                      ...statistics.trainings[trainingIndex],
                      timeVariance: totalActivities > 0 ? Math.round(totalVariance / totalActivities) : 0
                    };
                  }
                }
              });
            }
          } catch (error) {
            logger.error('Error processing statistics:', {
              error: error.message,
              stack: error.stack,
              scheduleCount: schedules.length
            });
            // Continue with default statistics
          }
        }
      } catch (error) {
        logger.error('Error fetching schedules:', {
          error: error.message,
          stack: error.stack,
          query: baseQuery
        });
        // Continue with default statistics
      }

      const endTime = performance.now();
      logger.debug('Statistics request completed', {
        duration: `${Math.round(endTime - startTime)}ms`,
        scheduleCount: schedules.length,
        memoryUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
      });

      res.json(statistics);
    } catch (error) {
      logger.error('Error in statistics route:', {
        error: error.message,
        stack: error.stack,
        userId: req.user._id,
        query: req.query,
        duration: `${Math.round(performance.now() - startTime)}ms`
      });
      
      // Return default statistics structure even on error
      res.status(500).json({
        totalTrainingDays: 0,
        adherence: [],
        onTimeStartRate: '0%',
        averageDelay: '0min',
        daySpecificStats: {},
        mostDelayedActivities: [],
        mostEfficientActivities: [],
        trainers: [],
        trainings: [],
        metadata: {
          templates: [],
          trainers: []
        },
        error: error.message
      });
    }
  }
);

module.exports = router; 