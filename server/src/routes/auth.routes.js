const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/user.model');
const logger = require('../config/logger');

const router = express.Router();

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
};

// Health check endpoint
router.get('/health', (req, res) => {
  logger.debug('Health check request received');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Validation middleware
const validateRegistration = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty()
];

// Register new user
router.post('/register', validateRegistration, async (req, res, next) => {
  try {
    console.log('Registration request body:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create new user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      role: 'admin', // First user is admin
    });

    console.log('Creating new user:', { email, firstName, lastName, role: user.role });

    await user.save();
    console.log('User saved successfully');

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1d' }
    );

    res.status(201).json({
      token,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Registration error:', error);
    next(error);
  }
});

// Login
router.post('/login', (req, res, next) => {
  console.log('Login attempt received:', { email: req.body.email });
  
  passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err) {
      console.error('Login authentication error:', err);
      return next(err);
    }
    
    if (!user) {
      console.log('Login failed:', info?.message);
      return res.status(401).json({ message: info?.message || 'Invalid email or password' });
    }

    console.log('Login successful for user:', user.email);
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: user.toJSON()
    });
  })(req, res, next);
});

// Get current user
router.get('/me', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.json(req.user.toJSON());
});

// Update user profile
router.put('/profile', 
  passport.authenticate('jwt', { session: false }),
  [
    body('firstName').optional().trim().notEmpty(),
    body('lastName').optional().trim().notEmpty(),
    body('password').optional().isLength({ min: 6 })
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { firstName, lastName, password } = req.body;
      const user = req.user;

      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (password) user.password = password;

      await user.save();

      res.json({
        message: 'Profile updated successfully',
        user: user.toJSON()
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get all users (admin only)
router.get('/users', passport.authenticate('jwt', { session: false }), isAdmin, async (req, res, next) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
});

// Create new user (admin only)
router.post('/users', 
  passport.authenticate('jwt', { session: false }), 
  isAdmin,
  validateRegistration,
  async (req, res, next) => {
    try {
      const { email, password, firstName, lastName, role } = req.body;

      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      // Create new user
      const user = new User({
        email,
        password,
        firstName,
        lastName,
        role: role || 'trainer', // Default to trainer if not specified
      });

      await user.save();

      res.status(201).json(user.toJSON());
    } catch (error) {
      next(error);
    }
  }
);

// Update user (admin only)
router.put('/users/:id', 
  passport.authenticate('jwt', { session: false }), 
  isAdmin,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { email, password, firstName, lastName, role } = req.body;

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check email uniqueness if it's being changed
      if (email && email !== user.email) {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return res.status(400).json({ message: 'Email already in use' });
        }
        user.email = email;
      }

      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (password) user.password = password;
      if (role) user.role = role;

      await user.save();

      res.json(user.toJSON());
    } catch (error) {
      next(error);
    }
  }
);

// Delete user (admin only)
router.delete('/users/:id', 
  passport.authenticate('jwt', { session: false }), 
  isAdmin,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      // Prevent self-deletion
      if (id === req.user.id) {
        return res.status(400).json({ message: 'Cannot delete your own account' });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      await user.remove();

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router; 