const express = require('express');
const passport = require('passport');
const { body, param, validationResult } = require('express-validator');
const Schedule = require('../models/schedule.model');

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

// Create schedule (admin only)
router.post('/',
  passport.authenticate('jwt', { session: false }),
  isAdmin,
  validateSchedule,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const schedule = new Schedule({
        ...req.body,
        createdBy: req.user._id
      });

      await schedule.save();

      // Emit socket event for real-time updates
      req.app.get('io').emit('schedule:created', schedule);

      res.status(201).json(schedule);
    } catch (error) {
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

// Update session status
router.patch('/:id/sessions/:sessionId',
  passport.authenticate('jwt', { session: false }),
  [
    param('id').isMongoId(),
    param('sessionId').isMongoId(),
    body('status').isIn(['pending', 'in-progress', 'completed', 'cancelled'])
  ],
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

      const session = schedule.sessions.id(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }

      session.status = req.body.status;
      await schedule.save();

      // Emit socket event for real-time updates
      req.app.get('io').emit('schedule:sessionUpdated', {
        scheduleId: schedule._id,
        sessionId: session._id,
        status: session.status
      });

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

module.exports = router; 