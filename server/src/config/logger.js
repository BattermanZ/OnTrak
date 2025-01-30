const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', '..', '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom timestamp format that uses local timezone
const timestampFormat = () => {
  return new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2');
};

// Custom format for better readability
const customFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level.toUpperCase()}] ${message}`;
  
  if (Object.keys(metadata).length > 0) {
    const { service, userId, method, url, status, socketId, ...rest } = metadata;
    
    if (userId) msg += ` - User: ${userId}`;
    if (method && url) msg += ` - ${method.toUpperCase()} ${url}`;
    if (status) msg += ` - Status: ${status}`;
    if (socketId) msg += ` - Socket: ${socketId}`;
    
    // Add remaining metadata if any
    const remaining = Object.keys(rest).length > 0 ? JSON.stringify(rest) : '';
    if (remaining) msg += ` - ${remaining}`;
  }
  return msg;
});

const logger = winston.createLogger({
  // Set default level to debug, can be overridden by LOG_LEVEL env variable
  level: process.env.LOG_LEVEL || 'debug',
  format: winston.format.combine(
    winston.format.timestamp({
      format: timestampFormat
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'backend' },
  transports: [
    // File transport for all logs (debug and above)
    new winston.transports.File({
      filename: path.join(logsDir, 'backend.log'),
      level: 'debug', // Changed to debug to capture all logs
      format: winston.format.combine(
        winston.format.timestamp({
          format: timestampFormat
        }),
        customFormat
      )
    }),

    // Console transport for development
    new winston.transports.Console({
      level: 'debug',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({
          format: timestampFormat
        }),
        customFormat
      )
    })
  ]
});

// Create a stream object with a 'write' function that will be used by morgan
logger.stream = {
  write: (message) => {
    // Log HTTP requests as debug level for more detailed information
    logger.debug(message.trim());
  }
};

// Log logger initialization
logger.debug('Logger initialized with level:', process.env.LOG_LEVEL || 'debug');

module.exports = logger; 