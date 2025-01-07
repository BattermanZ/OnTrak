const express = require('express');
const passport = require('passport');
const { body, param, validationResult } = require('express-validator');
const Schedule = require('../models/schedule.model');
const Template = require('../models/template.model');
const logger = require('../config/logger');

const router = express.Router();

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};

// Validation middleware
const validateSchedule = [
  body('title').trim().notEmpty(),
  body('startDate').isISO8601(),
  body('endDate').isISO8601(),
  body('trainer').isMongoId(),
  body('sessions').isArray(),
  body('sessions.*.date').isISO8601(),
  body('sessions.*.startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('sessions.*.endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('sessions.*.title').trim().notEmpty()
];

// Start day with template
router.post('/start-day',
  passport.authenticate('jwt', { session: false }),
  [
    body('templateId').isMongoId(),
    body('day').isInt({ min: 1 })
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { templateId, day } = req.body;

      // Get template
      const template = await Template.findById(templateId);
      if (!template) {
        return res.status(404).json({ message: 'Template not found' });
      }

      // Validate day
      if (day > template.days) {
        return res.status(400).json({ message: `Day must be between 1 and ${template.days}` });
      }

      // Get activities for the day and sort them by start time
      const activities = template.activities
        .filter(a => a.day === day)
        .sort((a, b) => {
          const timeA = a.startTime.split(':').map(Number);
          const timeB = b.startTime.split(':').map(Number);
          return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
        });

      if (!activities.length) {
        return res.status(400).json({ message: 'No activities found for selected day' });
      }

      // Cancel any existing active schedule
      await Schedule.updateMany(
        { 
          createdBy: req.user._id,
          status: 'active'
        },
        { 
          status: 'cancelled'
        }
      );

      // Create schedule
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const schedule = new Schedule({
        title: `${template.name} - Day ${day}`,
        startDate: today,
        endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        activities: activities.map((a, index) => ({
          ...a.toObject(),
          status: index === 0 ? 'in-progress' : 'pending'
        })),
        currentActivityIndex: 0,
        status: 'active',
        createdBy: req.user._id,
        templateId: template._id,
        selectedDay: day
      });

      await schedule.save();

      // Safely emit socket event if io is available
      const io = req.app.get('io');
      if (io) {
        io.emit('schedule:updated', schedule);
      }

      res.status(201).json(schedule);
    } catch (error) {
      logger.error('Error starting day:', error);
      next(error);
    }
  }
);

// Skip current activity
router.post('/:id/skip/:activityId',
  passport.authenticate('jwt', { session: false }),
  [
    param('id').isMongoId(),
    param('activityId').isMongoId()
  ],
  async (req, res, next) => {
    try {
      const schedule = await Schedule.findById(req.params.id);
      if (!schedule) {
        return res.status(404).json({ message: 'Schedule not found' });
      }

      const activityIndex = schedule.activities.findIndex(
        a => a._id.toString() === req.params.activityId
      );

      if (activityIndex === -1) {
        return res.status(404).json({ message: 'Activity not found' });
      }

      if (activityIndex >= schedule.activities.length - 1) {
        return res.status(400).json({ message: 'No next activity available' });
      }

      // Mark current activity as completed and not active
      schedule.activities[activityIndex].status = 'completed';
      schedule.activities[activityIndex].isActive = false;
      schedule.activities[activityIndex].completed = true;
      
      // Move to next activity and mark it as in-progress
      schedule.activeActivityIndex = activityIndex + 1;
      schedule.activities[activityIndex + 1].status = 'in-progress';
      schedule.activities[activityIndex + 1].isActive = true;
      schedule.activities[activityIndex + 1].completed = false;

      await schedule.save();

      // Add virtual properties for the response
      const result = schedule.toObject();
      result.currentActivity = schedule.activities[schedule.activeActivityIndex];
      result.previousActivity = activityIndex > 0 ? schedule.activities[activityIndex] : null;
      result.nextActivity = activityIndex + 2 < schedule.activities.length ? schedule.activities[activityIndex + 2] : null;

      // Emit socket event for real-time updates
      const io = req.app.get('io');
      if (io) {
        io.emit('schedule:updated', result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Error skipping activity:', error);
      next(error);
    }
  }
);

// Go to previous activity
router.post('/:id/previous/:activityId',
  passport.authenticate('jwt', { session: false }),
  [
    param('id').isMongoId(),
    param('activityId').isMongoId()
  ],
  async (req, res, next) => {
    try {
      const schedule = await Schedule.findById(req.params.id);
      if (!schedule) {
        return res.status(404).json({ message: 'Schedule not found' });
      }

      const activityIndex = schedule.activities.findIndex(
        a => a._id.toString() === req.params.activityId
      );

      if (activityIndex === -1) {
        return res.status(404).json({ message: 'Activity not found' });
      }

      if (activityIndex === 0) {
        return res.status(400).json({ message: 'No previous activity available' });
      }

      // Mark current activity as pending
      schedule.activities[activityIndex].status = 'pending';
      
      // Move to previous activity and mark it as in-progress
      schedule.currentActivityIndex = activityIndex - 1;
      schedule.activities[activityIndex - 1].status = 'in-progress';

      await schedule.save();

      // Emit socket event for real-time updates
      const io = req.app.get('io');
      if (io) {
        io.emit('schedule:updated', schedule);
      }

      res.json(schedule);
    } catch (error) {
      logger.error('Error going to previous activity:', error);
      next(error);
    }
  }
);

// Get all schedules (filtered by role)
router.get('/',
  passport.authenticate('jwt', { session: false }),
  async (req, res, next) => {
    try {
      const query = req.user.role === 'trainer' 
        ? { trainer: req.user._id }
        : {};

      const schedules = await Schedule.find(query)
        .populate('trainer', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName');

      res.json(schedules);
    } catch (error) {
      next(error);
    }
  }
);

// Get current schedule
router.get('/current',
  passport.authenticate('jwt', { session: false }),
  async (req, res, next) => {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      const schedule = await Schedule.findOne({
        createdBy: req.user._id,
        status: 'active',
        date: {
          $gte: startOfDay,
          $lt: endOfDay
        }
      }).sort('-createdAt');

      if (!schedule) {
        return res.json(null);
      }

      // Add virtual properties
      const currentActivity = schedule.getCurrentActivity();
      const previousActivity = schedule.getPreviousActivity();
      const nextActivity = schedule.getNextActivity();

      const result = schedule.toObject();
      result.currentActivity = currentActivity;
      result.previousActivity = previousActivity;
      result.nextActivity = nextActivity;

      res.json(result);
    } catch (error) {
      logger.error('Error getting current schedule:', error);
      next(error);
    }
  }
);

// Get schedule by ID
router.get('/:id',
  passport.authenticate('jwt', { session: false }),
  param('id').isMongoId(),
  async (req, res, next) => {
    try {
      const schedule = await Schedule.findById(req.params.id)
        .populate('trainer', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName');

      if (!schedule) {
        return res.status(404).json({ message: 'Schedule not found' });
      }

      // Check access rights
      if (req.user.role === 'trainer' && schedule.trainer.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }

      res.json(schedule);
    } catch (error) {
      next(error);
    }
  }
);

// Update schedule
router.put('/:id',
  passport.authenticate('jwt', { session: false }),
  param('id').isMongoId(),
  validateSchedule,
  async (req, res, next) => {
    try {
      const schedule = await Schedule.findById(req.params.id);

      if (!schedule) {
        return res.status(404).json({ message: 'Schedule not found' });
      }

      // Check access rights
      if (req.user.role === 'trainer' && schedule.trainer.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }

      Object.assign(schedule, req.body);
      await schedule.save();

      // Emit socket event for real-time updates
      req.app.get('io').emit('schedule:updated', schedule);

      res.json(schedule);
    } catch (error) {
      next(error);
    }
  }
);

// Delete schedule (admin only)
router.delete('/:id',
  passport.authenticate('jwt', { session: false }),
  isAdmin,
  param('id').isMongoId(),
  async (req, res, next) => {
    try {
      const schedule = await Schedule.findByIdAndDelete(req.params.id);

      if (!schedule) {
        return res.status(404).json({ message: 'Schedule not found' });
      }

      // Emit socket event for real-time updates
      req.app.get('io').emit('schedule:deleted', schedule._id);

      res.json({ message: 'Schedule deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Close current day
router.post('/close-day',
  passport.authenticate('jwt', { session: false }),
  async (req, res, next) => {
    try {
      const schedule = await Schedule.findOne({
        createdBy: req.user._id,
        status: 'active'
      });

      if (!schedule) {
        return res.status(404).json({ message: 'No active schedule found' });
      }

      schedule.status = 'completed';
      await schedule.save();

      // Emit socket event for real-time updates
      const io = req.app.get('io');
      if (io) {
        io.emit('schedule:updated', schedule);
      }

      res.json({ message: 'Day closed successfully' });
    } catch (error) {
      logger.error('Error closing day:', error);
      next(error);
    }
  }
);

module.exports = router; 