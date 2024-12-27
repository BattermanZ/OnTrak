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

const logger = winston.createLogger({
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
    // Write all logs to a single file
    new winston.transports.File({
      filename: path.join(logsDir, 'backend.log'),
      level: 'debug',
      format: winston.format.combine(
        winston.format.timestamp({
          format: timestampFormat
        }),
        winston.format.printf(
          ({ level, message, timestamp, ...metadata }) => {
            let msg = `${timestamp} [${level.toUpperCase()}] ${message}`;
            if (Object.keys(metadata).length > 0 && metadata.service) {
              msg += ` ${JSON.stringify(metadata)}`;
            }
            return msg;
          }
        )
      )
    }),
    // Console transport for development
    new winston.transports.Console({
      level: 'debug',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(
          ({ level, message, timestamp, ...metadata }) => {
            let msg = `${timestamp} [${level.toUpperCase()}] ${message}`;
            if (Object.keys(metadata).length > 0 && metadata.service) {
              msg += ` ${JSON.stringify(metadata)}`;
            }
            return msg;
          }
        )
      )
    })
  ]
});

// Create a stream object for Morgan middleware
logger.stream = {
  write: (message) => logger.http(message.trim())
};

module.exports = logger; 