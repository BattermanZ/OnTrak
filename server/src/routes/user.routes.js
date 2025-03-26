const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../config/logger');

// Get user count - no auth required as this is used for first-time setup
router.get('/count', async (req, res) => {
  try {
    // Add timeout to the query
    const count = await User.countDocuments().maxTimeMS(5000);
    
    logger.debug('User count request successful', { count });
    res.json({ count });
  } catch (error) {
    logger.error('Error counting users:', {
      error: error.message,
      stack: error.stack
    });
    
    // Send appropriate error response
    if (error.name === 'MongoServerError') {
      res.status(503).json({
        message: 'Database error while counting users',
        error: 'Service temporarily unavailable'
      });
    } else {
      res.status(500).json({
        message: 'Error counting users',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
});

module.exports = router; 