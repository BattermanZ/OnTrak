const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const passport = require('passport');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const logger = require('./config/logger');
const path = require('path');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const statisticsRoutes = require('./routes/statistics.routes');
const backupRoutes = require('./routes/backup.routes');
const backupScheduler = require('./utils/scheduler');

// Load .env from multiple possible locations
const envPaths = [
  path.join(__dirname, '../../.env'),  // Local development
  path.join(__dirname, '../.env'),     // Docker container
  '/.env',                            // Root in Docker
  '.env'                              // Current directory
];

// Try loading .env from each possible location
let envLoaded = false;
for (const envPath of envPaths) {
  if (require('fs').existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    logger.info('Loaded .env from:', envPath);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  logger.warn('No .env file found in any of the following locations:', envPaths);
}

// Debug environment variables
logger.info('Environment Variables:', {
  nodeEnv: process.env.NODE_ENV,
  clientUrl: process.env.CLIENT_URL,
  backendUrl: process.env.BACKEND_URL,
  port: process.env.PORT,
  envPaths
});

require('./config/passport');

// Environment-specific configuration
const isDevelopment = process.env.NODE_ENV !== 'production';
const PORT = process.env.PORT || 3456;

// Define allowed origins using environment variables
const allowedOrigins = isDevelopment
  ? ['http://localhost:3000', 'http://localhost:3456']
  : [
      process.env.CLIENT_URL,
      // Allow IP-based origins for local network testing
      'http://192.168.31.24:3457',
      'http://192.168.31.24:3456'
    ].filter(Boolean);

logger.info('CORS Configuration:', {
  environment: process.env.NODE_ENV,
  allowedOrigins,
  clientUrl: process.env.CLIENT_URL,
  backendUrl: process.env.BACKEND_URL
});

const app = express();

// Trust proxy settings (before any middleware)
app.set('trust proxy', true);
app.enable('trust proxy');

const server = require('http').createServer(app);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    logger.debug('CORS Origin Check:', { 
      receivedOrigin: origin,
      allowedOrigins,
      isDevelopment
    });

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || isDevelopment) {
      logger.debug('No origin or development mode, allowing request');
      return callback(null, true);
    }
    
    // Check if the origin is allowed
    const isAllowed = allowedOrigins.some(allowed => {
      if (!allowed) return false;
      // Exact match
      if (origin === allowed) return true;
      // Match without trailing slash
      if (origin.replace(/\/$/, '') === allowed) return true;
      // Match with trailing slash
      if (origin === allowed + '/') return true;
      // Match IP-based origins
      if (origin.startsWith('http://192.168.')) return true;
      return false;
    });

    if (isAllowed) {
      logger.debug('CORS allowed origin:', origin);
      callback(null, true);
    } else {
      logger.warn('CORS blocked request:', {
        origin,
        allowedOrigins,
        isDevelopment,
        clientUrl: process.env.CLIENT_URL,
        backendUrl: process.env.BACKEND_URL
      });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600 // 10 minutes
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Body parser with increased limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const io = require('socket.io')(server, {
  cors: corsOptions
});

// Make io available to routes
app.set('io', io);

// Register critical endpoints before any restrictive middleware
app.get('/api/health', (req, res) => {
  logger.debug('Health check request received');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Register logs route (also needs to be before rate limiting)
app.use('/api/logs', require('./routes/logs.routes'));

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // 200 requests per minute
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all other API routes
app.use('/api/', (req, res, next) => {
  // Skip rate limiting for health and logs endpoints
  if (req.path === '/health' || req.path.startsWith('/logs')) {
    return next();
  }
  return limiter(req, res, next);
});

// Now apply security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", ...allowedOrigins],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", ...allowedOrigins],
      styleSrc: ["'self'", "'unsafe-inline'", ...allowedOrigins],
      imgSrc: ["'self'", "data:", "blob:", ...allowedOrigins],
      connectSrc: ["'self'", ...allowedOrigins],
      fontSrc: ["'self'", "data:", ...allowedOrigins],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", ...allowedOrigins],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(mongoSanitize()); // Sanitize data against NoSQL query injection
app.use(xss()); // Sanitize data against XSS attacks
app.use(hpp()); // Protect against HTTP Parameter Pollution attacks

// Cookie parser
app.use(cookieParser());

// Add request timeout middleware
app.use((req, res, next) => {
  const timeout = 30000;
  req.setTimeout(timeout, () => {
    const err = new Error('Request timeout');
    err.status = 408;
    next(err);
  });
  res.setTimeout(timeout, () => {
    const err = new Error('Response timeout');
    err.status = 503;
    next(err);
  });
  next();
});

// Global error handler with detailed logging
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const errorResponse = {
    message: err.message || 'Internal server error',
    status,
    timestamp: new Date().toISOString()
  };

  // Log error with context
  logger.error('Request error:', {
    error: err.message,
    stack: err.stack,
    status,
    method: req.method,
    url: req.url,
    query: req.query,
    body: req.body,
    user: req.user ? req.user._id : 'anonymous',
    ip: req.ip
  });

  // Add error details in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.code = err.code;
  }

  res.status(status).json(errorResponse);
});

// Add memory monitoring with alerts
const monitorMemory = () => {
  const used = process.memoryUsage();
  const memoryThresholdMB = 1024; // 1GB threshold

  setInterval(() => {
    const currentUsage = process.memoryUsage();
    const usage = {
      heapUsed: `${Math.round(currentUsage.heapUsed / 1024 / 1024 * 100) / 100} MB`,
      heapTotal: `${Math.round(currentUsage.heapTotal / 1024 / 1024 * 100) / 100} MB`,
      rss: `${Math.round(currentUsage.rss / 1024 / 1024 * 100) / 100} MB`,
      external: `${Math.round(currentUsage.external / 1024 / 1024 * 100) / 100} MB`
    };

    // Log regular memory usage
    logger.debug('Memory usage', usage);

    // Check for memory leaks
    if (currentUsage.heapUsed > used.heapUsed * 1.5) {
      logger.warn('Potential memory leak detected', usage);
    }

    // Alert on high memory usage
    if (currentUsage.heapUsed / 1024 / 1024 > memoryThresholdMB) {
      logger.error('Critical memory usage detected', {
        ...usage,
        threshold: `${memoryThresholdMB} MB`
      });

      // Force garbage collection if available (use with caution)
      if (global.gc) {
        logger.info('Forcing garbage collection');
        global.gc();
      }
    }
  }, 60000); // Check every minute
};

// Start memory monitoring
monitorMemory();

// Enhanced process-level error handling
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack,
    type: error.name
  });

  // Attempt to perform cleanup
  try {
    gracefulShutdown('uncaught exception');
  } catch (cleanupError) {
    logger.error('Error during cleanup after uncaught exception:', cleanupError);
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: promise
  });
});

// Enhanced graceful shutdown
const gracefulShutdown = async (signal) => {
  let exitCode = 0;
  const shutdownTimeout = 30000; // 30 seconds
  let forcedShutdownTimeout;

  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Start force shutdown timeout
  forcedShutdownTimeout = setTimeout(() => {
    logger.error('Forced shutdown initiated after timeout');
    process.exit(1);
  }, shutdownTimeout);

  try {
    // Close all socket connections
    logger.info('Closing socket connections...');
    for (const socketId of connectedSockets) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
      }
    }
    await new Promise(resolve => io.close(resolve));
    logger.info('Socket connections closed');

    // Close database connection
    logger.info('Closing database connection...');
    await mongoose.connection.close(false);
    logger.info('Database connection closed');

    // Close HTTP server
    logger.info('Closing HTTP server...');
    await new Promise((resolve, reject) => {
      server.close(err => {
        if (err) {
          logger.error('Error closing HTTP server:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
    logger.info('HTTP server closed');

  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    exitCode = 1;
  } finally {
    // Clear the force shutdown timeout
    clearTimeout(forcedShutdownTimeout);
    
    // Final cleanup
    logger.info(`Graceful shutdown completed with exit code ${exitCode}`);
    process.exit(exitCode);
  }
};

// Register shutdown handlers
const shutdownSignals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
shutdownSignals.forEach(signal => {
  process.on(signal, () => gracefulShutdown(signal));
});

// Trust proxy if behind a reverse proxy
app.set('trust proxy', 1);

// Serve static files only in production
if (!isDevelopment) {
  app.use(express.static(path.join(__dirname, '../../client/build'), {
    fallthrough: true,
    maxAge: '1h',
    etag: true,
    lastModified: true,
    onError: (err, req, res, next) => {
      logger.error('Static file error:', { 
        error: err.message, 
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      next(err);
    }
  }));
}

// Passport middleware
app.use(passport.initialize());

// Setup request logging
app.use(morgan('combined', { stream: logger.stream }));

// MongoDB Connection configuration
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ontrak';

// MongoDB Connection with retry logic and proper error handling
const connectWithRetry = async (retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      logger.info('Connected to MongoDB');
      return true;
    } catch (error) {
      logger.error('MongoDB connection error:', error);
      if (i === retries - 1) {
        logger.error('Max retries reached, exiting...');
        process.exit(1);
      }
      logger.info(`Retrying in ${delay/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return false;
};

// Handle MongoDB connection errors
mongoose.connection.on('error', err => {
  logger.error('MongoDB connection error:', err);
  setTimeout(() => connectWithRetry(), 5000);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected. Attempting to reconnect...');
  setTimeout(() => connectWithRetry(), 5000);
});

// Socket.io connection handling with error handling and memory leak prevention
const connectedSockets = new Set();

io.on('connection', (socket) => {
  connectedSockets.add(socket.id);
  logger.debug('New client connected', { 
    socketId: socket.id,
    activeConnections: connectedSockets.size 
  });
  
  // Handle socket errors
  socket.on('error', (error) => {
    logger.error('Socket error:', { socketId: socket.id, error: error.message });
  });

  socket.on('disconnect', () => {
    connectedSockets.delete(socket.id);
    logger.debug('Client disconnected', { 
      socketId: socket.id,
      activeConnections: connectedSockets.size 
    });
  });
});

// API Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/templates', passport.authenticate('jwt', { session: false }), require('./routes/template.routes'));
app.use('/api/schedules', passport.authenticate('jwt', { session: false }), require('./routes/schedule.routes'));
app.use('/api/statistics', passport.authenticate('jwt', { session: false }), statisticsRoutes);
app.use('/api/backups', passport.authenticate('jwt', { session: false }), backupRoutes);

// Start backup scheduler
backupScheduler.start();

// The catchall handler: for any request that doesn't match API routes,
// send back React's index.html file in production only
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  if (!isDevelopment) {
    res.sendFile(path.join(__dirname, '../../client/build/index.html'));
  } else {
    // In development, let the request fall through to the next middleware
    // This allows the React development server to handle the request
    next();
  }
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    status: 'error',
    message: `API endpoint not found: ${req.path}`
  });
});

// Start the server only after MongoDB is connected
const startServer = async () => {
  try {
    // Connect to MongoDB first
    const connected = await connectWithRetry();
    if (!connected) {
      logger.error('Failed to connect to MongoDB after retries');
      process.exit(1);
    }

    // Start the HTTP server
    server.listen(PORT, '0.0.0.0', () => {
      logger.info('Server Configuration:', {
        port: PORT,
        environment: process.env.NODE_ENV,
        bindAddress: '0.0.0.0',
        allowedOrigins,
        clientUrl: process.env.CLIENT_URL,
        backendUrl: process.env.BACKEND_URL,
        trustProxy: app.get('trust proxy')
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Add graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Starting graceful shutdown...');
  server.close(() => {
    logger.info('HTTP server closed');
    mongoose.connection.close(false, () => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', {
    error: err.message,
    stack: err.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', {
    promise,
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined
  });
}); 