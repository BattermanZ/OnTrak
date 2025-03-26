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
const getDateFilter = (range, customStart, customEnd) => {
  const now = new Date();
  
  switch (range) {
    case 'custom': {
      if (!customStart || !customEnd) {
        logger.warn('Custom date range missing start or end date');
        return null;
      }

      // Parse DD/MM/YYYY format
      const [startDay, startMonth, startYear] = customStart.split('/');
      const [endDay, endMonth, endYear] = customEnd.split('/');
      
      const startDate = new Date(startYear, startMonth - 1, startDay);
      const endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59); // End of the day
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        logger.warn('Invalid custom date format', { customStart, customEnd });
        return null;
      }

      logger.debug('Custom date filter:', {
        range,
        start: startDate.toISOString(),
        end: endDate.toISOString()
      });

      return {
        $gte: startDate,
        $lt: endDate
      };
    }
    case 'week': {
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Start from Monday
      logger.debug('Week filter:', {
        range,
        start: weekStart.toISOString(),
        end: now.toISOString()
      });
      return { 
        $gte: weekStart,
        $lt: now 
      };
    }
    case 'month': {
      const monthStart = startOfMonth(now);
      logger.debug('Month filter:', {
        range,
        start: monthStart.toISOString(),
        end: now.toISOString()
      });
      return { 
        $gte: monthStart,
        $lt: now 
      };
    }
    case 'year': {
      const yearStart = startOfYear(now);
      logger.debug('Year filter:', {
        range,
        start: yearStart.toISOString(),
        end: now.toISOString()
      });
      return { 
        $gte: yearStart,
        $lt: now 
      };
    }
    case 'all':
      logger.debug('No date filter (all time)');
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
    trainers: [],
    dailyStats: []
  };

  let totalActivities = 0;
  let onTimeStarts = 0;
  const activityStats = new Map();
  const dayStats = new Map();
  const trainingStats = new Map();
  const dailyTimeVariance = new Map();

  schedules.forEach(schedule => {
    if (!schedule.activities || !Array.isArray(schedule.activities)) {
      logger.warn('Invalid schedule activities', { scheduleId: schedule._id });
      return;
    }

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

    // Initialize daily stats tracking
    const dayKey = schedule.selectedDay;
    if (!dailyTimeVariance.has(dayKey)) {
      dailyTimeVariance.set(dayKey, {
        totalVariance: 0,
        activityCount: 0,
        day: dayKey
      });
    }

    // Initialize day stats for activity tracking
    const dayStatsKey = `${templateId}-${dayKey}`;
    if (!dayStats.has(dayStatsKey)) {
      dayStats.set(dayStatsKey, {
        templateId: templateId,
        day: dayKey,
        activities: new Map(),
        totalVariance: 0,
        activityCount: 0
      });
    }
    
    schedule.activities.forEach(activity => {
      // Skip invalid activities
      if (!activity.name || activity.deleted || !activity.startTime || !activity.duration) {
        return;
      }

      // Skip uncompleted activities
      if (!activity.completed || !activity.actualStartTime || !activity.actualEndTime) {
        return;
      }

      totalActivities++;
      
      // Initialize activity stats
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
      
      try {
        // Calculate variances
        const scheduledStart = parseISO(`${schedule.date.toISOString().split('T')[0]}T${activity.startTime}`);
        const actualStart = new Date(activity.actualStartTime);
        const startVariance = differenceInMinutes(actualStart, scheduledStart);

        const actualDuration = differenceInMinutes(
          new Date(activity.actualEndTime),
          new Date(activity.actualStartTime)
        );
        const scheduledDuration = activity.duration;
        const durationVariance = actualDuration - scheduledDuration;

        // Update activity stats
        const stats = activityStats.get(activity.name);
        stats.count++;
        stats.totalDuration += scheduledDuration;
        stats.totalActualDuration += actualDuration;
        stats.totalTimeVariance += durationVariance;

        // Update punctuality stats
        const punctualityThreshold = Math.max(5, scheduledDuration * 0.1);
        if (startVariance < 0 || Math.abs(startVariance) <= punctualityThreshold) {
          onTimeStarts++;
          stats.onTime++;
        } else {
          stats.delayed++;
        }
        
        // Update adherence array
        statistics.adherence.push({
          activity: activity.name,
          onTime: (startVariance < 0 || Math.abs(startVariance) <= punctualityThreshold) ? "1" : "0",
          delayed: (startVariance > 0 && Math.abs(startVariance) > punctualityThreshold) ? "1" : "0",
          averageVariance: durationVariance.toString()
        });

        // Update day-specific stats
        const dayData = dayStats.get(dayStatsKey);
        const dayActivities = dayData.activities;
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
        dayData.totalVariance += durationVariance;
        dayData.activityCount++;

        // Update training stats
        const trainingData = trainingStats.get(templateId.toString());
        trainingData.totalVariance += durationVariance;
        trainingData.activityCount++;

        // Update daily variance stats
        const dailyData = dailyTimeVariance.get(dayKey);
        dailyData.totalVariance += durationVariance;
        dailyData.activityCount++;

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
    
    console.log('Final activity stats:', {
        activity: name,
      averageActualDuration,
      averageScheduledDuration,
      averageDelay,
      count: stats.count,
      totalActualDuration: stats.totalActualDuration,
      totalScheduledDuration: stats.totalDuration,
      isEfficient: averageDelay < 0,
      isDelayed: averageDelay > 0,
      onTimeCount: stats.onTime,
      delayedCount: stats.delayed
    });

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

  // Log final arrays
  console.log('Most efficient activities:', statistics.mostEfficientActivities);
  console.log('Most delayed activities:', statistics.mostDelayedActivities);

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

  // Convert daily stats to array format
  statistics.dailyStats = Array.from(dailyTimeVariance.values())
    .map(stats => ({
      name: `Day ${stats.day}`,
      timeVariance: stats.activityCount > 0 ? 
        Math.round(stats.totalVariance / stats.activityCount) : 0,
      day: stats.day
    }))
    .sort((a, b) => a.day - b.day); // Sort by day number

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
      const dateFilter = getDateFilter(req.query.dateRange, req.query.customStart, req.query.customEnd);
      if (dateFilter !== null) {
        baseQuery.date = dateFilter;
        logger.debug('Applied date filter:', { 
          dateRange: req.query.dateRange,
          filter: dateFilter,
          filterStart: dateFilter.$gte ? dateFilter.$gte.toISOString() : null,
          filterEnd: dateFilter.$lt ? dateFilter.$lt.toISOString() : null
        });
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
          dateRange: req.query.dateRange,
          dateFilter: baseQuery.date,
          firstSchedule: schedules[0] ? {
            id: schedules[0]._id,
            date: schedules[0].date,
            activities: schedules[0].activities.length,
            hasDate: !!schedules[0].date,
            hasTemplateId: !!schedules[0].templateId,
            hasCreatedBy: !!schedules[0].createdBy,
            completedActivities: schedules[0].activities.filter(a => a.completed).length,
            templateName: schedules[0].templateId?.name,
            trainerName: schedules[0].createdBy ? `${schedules[0].createdBy.firstName} ${schedules[0].createdBy.lastName}` : null
          } : null,
          lastSchedule: schedules[schedules.length - 1] ? {
            id: schedules[schedules.length - 1]._id,
            date: schedules[schedules.length - 1].date
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

              // Process training-specific statistics for this trainer
              if (req.query.training && req.query.training !== 'all') {
                const templateSchedules = schedules.filter(s => 
                  (s.templateId?._id || s.templateId)?.toString() === req.query.training
                );
                
                if (templateSchedules.length > 0) {
                  const dailyStats = new Map();
                  
                  templateSchedules.forEach(schedule => {
                    const day = schedule.selectedDay;
                    if (!dailyStats.has(day)) {
                      dailyStats.set(day, {
                        totalVariance: 0,
                        activityCount: 0,
                        day: day,
                        activities: new Map(),
                        trainers: new Map()
                      });
                    }
                    const dayStats = dailyStats.get(day);
                    
                    schedule.activities.forEach(activity => {
                      if (activity.completed && activity.actualStartTime && activity.actualEndTime) {
                        const actualDuration = differenceInMinutes(
                          new Date(activity.actualEndTime),
                          new Date(activity.actualStartTime)
                        );
                        const scheduledDuration = activity.duration || 0;  // Ensure we have a number
                        const variance = actualDuration - scheduledDuration;
                        
                        // Update activity-specific stats
                        if (!dayStats.activities.has(activity.name)) {
                          dayStats.activities.set(activity.name, {
                            name: activity.name,
                            totalVariance: 0,
                            totalActualDuration: 0,
                            totalScheduledDuration: 0,
                            count: 0
                          });
                        }
                        const activityStats = dayStats.activities.get(activity.name);
                        activityStats.totalVariance += variance;
                        activityStats.totalActualDuration += actualDuration;
                        activityStats.totalScheduledDuration += scheduledDuration;
                        activityStats.count++;
                        
                        dayStats.totalVariance += variance;
                        dayStats.activityCount++;
                      }
                    });
                  });
                  
                  // Convert daily stats to array and add to statistics
                  statistics.dailyStats = Array.from(dailyStats.values())
                    .map(stats => ({
                      name: `Day ${stats.day}`,
                      timeVariance: stats.activityCount > 0 ? 
                        Math.round(stats.totalVariance / stats.activityCount) : 0,
                      day: stats.day,
                      activities: Array.from(stats.activities.values())
                        .map(activityStats => ({
                          name: activityStats.name,
                          timeVariance: activityStats.count > 0 ?
                            Math.round(activityStats.totalVariance / activityStats.count) : 0,
                          averageActualDuration: activityStats.count > 0 ?
                            Math.round(activityStats.totalActualDuration / activityStats.count) : 0,
                          scheduledDuration: activityStats.count > 0 ?
                            Math.round(activityStats.totalScheduledDuration / activityStats.count) : 0
                        }))
                        .sort((a, b) => b.timeVariance - a.timeVariance)  // Sort by variance
                    }))
                    .sort((a, b) => a.day - b.day);

                  // Also update daySpecificStats for consistency
                  const dayKey = `${req.query.training}-${req.query.day}`;
                  if (dailyStats.has(parseInt(req.query.day))) {
                    const dayData = dailyStats.get(parseInt(req.query.day));
                    statistics.daySpecificStats[dayKey] = {
                      activities: Array.from(dayData.activities.values())
                        .map(activityStats => ({
                          name: activityStats.name,
                          scheduledDuration: activityStats.count > 0 ?
                            `${Math.round(activityStats.totalScheduledDuration / activityStats.count)}min` : '0min',
                          averageActualDuration: activityStats.count > 0 ?
                            `${Math.round(activityStats.totalActualDuration / activityStats.count)}min` : '0min',
                          averageVariance: activityStats.count > 0 ?
                            `${Math.round(activityStats.totalVariance / activityStats.count)}min` : '0min'
                        }))
                    };
                  }
                }
              }

              // Use the processed stats for overall statistics
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
                  
                  // Track daily stats for this training
                  const dailyStats = new Map();
                  
                  templateSchedules.forEach(schedule => {
                    const day = schedule.selectedDay;
                    if (!dailyStats.has(day)) {
                      dailyStats.set(day, {
                        totalVariance: 0,
                        activityCount: 0,
                        day: day,
                        activities: new Map(),  // Track stats per activity
                        trainers: new Map()  // Track stats per trainer
                      });
                    }
                    const dayStats = dailyStats.get(day);
                    
                    // Initialize trainer stats if not exists
                    const trainerId = schedule.createdBy?._id || schedule.createdBy;
                    if (trainerId && !dayStats.trainers.has(trainerId.toString())) {
                      dayStats.trainers.set(trainerId.toString(), {
                        totalVariance: 0,
                        activityCount: 0,
                        name: `${schedule.createdBy?.firstName} ${schedule.createdBy?.lastName}`
                      });
                    }
                    
                    schedule.activities.forEach(activity => {
                      if (activity.completed && activity.actualStartTime && activity.actualEndTime) {
                        const actualDuration = differenceInMinutes(
                          new Date(activity.actualEndTime),
                          new Date(activity.actualStartTime)
                        );
                        const scheduledDuration = activity.duration;
                        const variance = actualDuration - scheduledDuration;
                        
                        // Update activity-specific stats
                        if (!dayStats.activities.has(activity.name)) {
                          dayStats.activities.set(activity.name, {
                            name: activity.name,
                            totalVariance: 0,
                            totalActualDuration: 0,
                            totalScheduledDuration: 0,
                            count: 0
                          });
                        }
                        const activityStats = dayStats.activities.get(activity.name);
                        activityStats.totalVariance += variance;
                        activityStats.totalActualDuration += actualDuration;
                        activityStats.totalScheduledDuration += scheduledDuration;
                        activityStats.count++;
                        
                        dayStats.totalVariance += variance;
                        dayStats.activityCount++;
                        totalVariance += variance;
                        totalActivities++;
                      }
                    });
                  });
                  
                  // Convert daily stats to array and add to statistics
                  if (template._id.toString() === req.query.training) {
                    statistics.dailyStats = Array.from(dailyStats.values())
                      .map(stats => ({
                        name: `Day ${stats.day}`,
                        timeVariance: stats.activityCount > 0 ? 
                          Math.round(stats.totalVariance / stats.activityCount) : 0,
                        day: stats.day,
                        activities: Array.from(stats.activities.values())
                          .map(activityStats => ({
                            name: activityStats.name,
                            timeVariance: activityStats.count > 0 ?
                              Math.round(activityStats.totalVariance / activityStats.count) : 0
                          })),
                        trainers: Array.from(stats.trainers.values())
                          .map(trainerStats => ({
                            name: trainerStats.name,
                            timeVariance: trainerStats.activityCount > 0 ?
                              Math.round(trainerStats.totalVariance / trainerStats.activityCount) : 0
                          }))
                      }))
                      .sort((a, b) => a.day - b.day);
                  }
                  
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