const winston = require('winston');
const path = require('path');
const fs = require('fs').promises;

// Ensure logs directory exists with proper permissions
const logsDir = path.join(__dirname, '..', '..', 'logs');

async function initializeLogger() {
  try {
    // Create logs directory with proper permissions if it doesn't exist
    await fs.mkdir(logsDir, { recursive: true, mode: 0o755 });
    
    // Create log files if they don't exist
    const backendLogPath = path.join(logsDir, 'backend.log');
    const frontendLogPath = path.join(logsDir, 'frontend.log');
    
    try {
      await fs.access(backendLogPath);
    } catch {
      await fs.writeFile(backendLogPath, '', { mode: 0o644 });
    }
    
    try {
      await fs.access(frontendLogPath);
    } catch {
      await fs.writeFile(frontendLogPath, '', { mode: 0o644 });
    }
  } catch (error) {
    console.error('Error initializing logger:', error);
    process.exit(1);
  }
}

// Initialize logger synchronously for immediate use
try {
  require('fs').mkdirSync(logsDir, { recursive: true, mode: 0o755 });
} catch (error) {
  console.error('Error creating logs directory:', error);
  process.exit(1);
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

// Format value helper function
const formatValue = (value) => {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.join('\n    ');
  }
  return JSON.stringify(value, null, 2);
};

// Custom format for better readability
const customFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  // Format the message
  let msg = `${timestamp} [${level.toUpperCase()}] ${message}`;
  
  // Add metadata if it exists, but format it nicely
  if (Object.keys(metadata).length > 0) {
    // Remove 'service' from metadata if it exists
    const { service, ...rest } = metadata;
    
    // Handle special cases for common metadata
    if (rest.envPaths) {
      msg += `\n  Paths checked:\n    ${formatValue(rest.envPaths)}`;
      delete rest.envPaths;
    }
    
    // Format remaining metadata
    const remainingKeys = Object.keys(rest);
    if (remainingKeys.length > 0) {
      const formattedMeta = remainingKeys
        .map(key => {
          const value = formatValue(rest[key]);
          return `${key}: ${value}`;
        })
        .join('\n  ');
      msg += `\n  ${formattedMeta}`;
    }
  }
  
  return msg;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  format: winston.format.combine(
    winston.format.timestamp({
      format: timestampFormat
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    customFormat
  ),
  defaultMeta: { service: 'backend' },
  transports: [
    // File transport for all logs (debug and above)
    new winston.transports.File({
      filename: path.join(logsDir, 'backend.log'),
      level: 'debug',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true,
      handleExceptions: true,
      handleRejections: true
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
      ),
      handleExceptions: true,
      handleRejections: true
    })
  ],
  exitOnError: false
});

// Create a stream object with a 'write' function that will be used by morgan
logger.stream = {
  write: (message) => {
    logger.debug(message.trim());
  }
};

// Initialize logger asynchronously
initializeLogger().catch(console.error);

// Log logger initialization
logger.debug('Logger initialized with level:', process.env.LOG_LEVEL || 'debug');

module.exports = logger; 