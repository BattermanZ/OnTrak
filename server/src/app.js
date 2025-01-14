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

require('dotenv').config();
require('./config/passport');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Make io available to routes
app.set('io', io);

// Security middleware
app.use(helmet()); // Set security HTTP headers
app.use(mongoSanitize()); // Sanitize data against NoSQL query injection
app.use(xss()); // Sanitize data against XSS attacks
app.use(hpp()); // Protect against HTTP Parameter Pollution attacks

// Cookie parser
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parser with increased limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Add request timeout middleware
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    logger.error('Request timeout', { 
      method: req.method,
      url: req.url,
      duration: 30000
    });
    res.status(408).json({ message: 'Request timeout' });
  });
  next();
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', { 
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  if (err.name === 'PayloadTooLargeError') {
    return res.status(413).json({
      message: 'Request entity too large',
      details: 'The request payload is too large. Please reduce the amount of data being sent.'
    });
  }
  
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Add memory monitoring
const used = process.memoryUsage();
setInterval(() => {
  const currentUsage = process.memoryUsage();
  const usage = {
    heapUsed: `${Math.round(currentUsage.heapUsed / 1024 / 1024 * 100) / 100} MB`,
    heapTotal: `${Math.round(currentUsage.heapTotal / 1024 / 1024 * 100) / 100} MB`,
    rss: `${Math.round(currentUsage.rss / 1024 / 1024 * 100) / 100} MB`
  };
  
  if (currentUsage.heapUsed > used.heapUsed * 1.5) {
    logger.warn('High memory usage detected', usage);
  }
  
  logger.debug('Memory usage', usage);
}, 60000);

// CORS configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600, // 10 minutes
};
app.use(cors(corsOptions));

// Trust proxy if behind a reverse proxy
app.set('trust proxy', 1);

// Passport middleware
app.use(passport.initialize());

// Setup request logging
app.use(morgan('combined', { stream: logger.stream }));

// MongoDB Connection configuration
const mongoUri = process.env.MONGODB_URI || 'mongodb://mongodb:27017/ontrak';

// MongoDB Connection with retry logic and proper error handling
const connectWithRetry = async (retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(mongoUri);
      logger.info('Connected to MongoDB');
      return;
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
};

connectWithRetry();

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

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Give time for logging before exit
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection:', error);
  // Give time for logging before exit
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Received shutdown signal. Starting graceful shutdown...');
  
  // Close all socket connections
  for (const socketId of connectedSockets) {
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      socket.disconnect(true);
    }
  }
  
  // Close Socket.IO server
  await new Promise(resolve => io.close(resolve));
  logger.info('Closed all socket connections');
  
  // Close MongoDB connection
  await mongoose.connection.close();
  logger.info('Closed MongoDB connection');
  
  // Close Express server
  server.close(() => {
    logger.info('Closed Express server');
    process.exit(0);
  });
  
  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Listen for shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// API Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/templates', passport.authenticate('jwt', { session: false }), require('./routes/template.routes'));
app.use('/api/schedules', passport.authenticate('jwt', { session: false }), require('./routes/schedule.routes'));
app.use('/api/logs', require('./routes/logs.routes'));
app.use('/api/statistics', statisticsRoutes);

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../../client/build')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  logger.debug('Health check request received');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/build', 'index.html'));
});

const PORT = process.env.PORT || 3456;
server.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server is running on 0.0.0.0:${PORT}`);
});

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