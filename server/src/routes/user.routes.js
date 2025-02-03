const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const { authenticateToken } = require('../middleware/auth');

// Get user count - no auth required as this is used for first-time setup
router.get('/count', async (req, res) => {
  try {
    const count = await User.countDocuments();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Error counting users', error: error.message });
  }
});

module.exports = router; 