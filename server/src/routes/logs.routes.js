const express = require('express');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { authenticate } = require('../middleware/auth');
const logger = require('../config/logger');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', '..', '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const router = express.Router();

// Handle frontend logs
router.post('/', async (req, res) => {
  try {
    const { logs } = req.body;
    if (!logs) {
      return res.status(400).json({ message: 'No logs provided' });
    }

    const frontendLogPath = path.join(logsDir, 'frontend.log');
    
    // Append logs to file
    await fsPromises.appendFile(frontendLogPath, logs);
    
    logger.debug('Frontend logs received and written to file', { 
      size: logs.length,
      user: req.user?._id || 'unauthenticated'
    });

    res.status(200).json({ message: 'Logs written successfully' });
  } catch (error) {
    logger.error('Error writing frontend logs', { error: error.message });
    res.status(500).json({ message: 'Failed to write logs' });
  }
});

module.exports = router; 