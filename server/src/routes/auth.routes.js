const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/user.model');
const logger = require('../config/logger');
const rateLimit = require('express-rate-limit');

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

// Strong password validation
const passwordValidation = body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters long')
  .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/)
  .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');

// Login rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per window
  message: 'Too many login attempts, please try again after 15 minutes'
});

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
      { algorithm: 'HS256' }
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
router.post('/login', loginLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    // Include password in the query since it's needed for comparison
    const user = await User.findOne({ email }).select('+password +active');

    if (!user || !user.active) {
      logger.warn('Login attempt with invalid credentials', { email });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if account is locked
    if (user.isLocked()) {
      logger.warn('Login attempt on locked account', { email });
      return res.status(401).json({ 
        message: 'Account is locked due to too many failed attempts. Please try again later.' 
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Handle failed login attempt
      await user.handleFailedLogin();
      logger.warn('Login attempt with incorrect password', { email });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Reset login attempts on successful login
    await user.handleSuccessfulLogin();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { 
        algorithm: 'HS256'
      }
    );

    // Set secure cookie
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    logger.info('User logged in successfully', { userId: user._id });
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('Login error', { error: error.message });
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Logout
router.post('/logout', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.clearCookie('jwt', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  res.json({ message: 'Logged out successfully' });
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
    const users = await User.find({}).select('+lastLogin').sort({ createdAt: -1 });
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

// Change password
router.put('/change-password',
  passport.authenticate('jwt', { session: false }),
  [
    body('currentPassword').notEmpty(),
    passwordValidation
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { currentPassword, newPassword } = req.body;
      const user = req.user;

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        logger.warn('Password change attempt with incorrect current password', { userId: user._id });
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      user.password = newPassword;
      user.passwordChangedAt = new Date();
      await user.save();

      // Force re-login after password change
      res.clearCookie('jwt');
      logger.info('Password changed successfully', { userId: user._id });
      res.json({ message: 'Password updated successfully. Please login again.' });
    } catch (error) {
      logger.error('Password change error', { error: error.message });
      next(error);
    }
  }
);

module.exports = router; 