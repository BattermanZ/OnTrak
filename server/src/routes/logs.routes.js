const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { authenticate } = require('../middleware/auth');
const logger = require('../config/logger');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', '..', 'logs');

// Initialize logs directory and files
async function initializeLogsDirectory() {
  try {
    await fs.mkdir(logsDir, { recursive: true, mode: 0o755 });
    
    const frontendLogPath = path.join(logsDir, 'frontend.log');
    const backendLogPath = path.join(logsDir, 'backend.log');
    
    // Create log files if they don't exist
    for (const logPath of [frontendLogPath, backendLogPath]) {
      try {
        await fs.access(logPath);
      } catch {
        await fs.writeFile(logPath, '', { mode: 0o644 });
      }
    }
  } catch (error) {
    logger.error('Error initializing logs directory:', error);
    throw error;
  }
}

// Initialize synchronously for immediate use
try {
  require('fs').mkdirSync(logsDir, { recursive: true, mode: 0o755 });
} catch (error) {
  logger.error('Error creating logs directory:', error);
  process.exit(1);
}

const router = express.Router();

// Handle frontend logs
router.post('/', async (req, res) => {
  try {
    const { logs, timestamp } = req.body;
    if (!logs) {
      return res.status(400).json({ message: 'No logs provided' });
    }

    const frontendLogPath = path.join(logsDir, 'frontend.log');
    
    // Ensure the file exists
    try {
      await fs.access(frontendLogPath);
    } catch {
      await fs.writeFile(frontendLogPath, '', { mode: 0o644 });
    }
    
    // Format logs with timestamp if not already formatted
    const formattedLogs = timestamp ? logs : `${new Date().toISOString()} ${logs}`;
    
    // Append logs to file with error handling
    try {
      const fileHandle = await fs.open(frontendLogPath, 'a');
      try {
        await fileHandle.write(formattedLogs);
      } finally {
        await fileHandle.close();
      }
    } catch (error) {
      logger.error('Error writing to frontend log file:', error);
      throw error;
    }
    
    logger.debug('Frontend logs received and written to file', { 
      size: logs.length,
      user: req.user?._id || 'unauthenticated'
    });

    res.status(200).json({ message: 'Logs written successfully' });
  } catch (error) {
    logger.error('Error handling frontend logs:', { 
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      message: 'Failed to write logs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Initialize logs directory asynchronously
initializeLogsDirectory().catch(error => {
  logger.error('Failed to initialize logs directory:', error);
  process.exit(1);
});

module.exports = router; 