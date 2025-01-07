const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const passport = require('passport');
const logger = require('./config/logger');
const path = require('path');
const morgan = require('morgan');

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

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));
app.use(express.json());
app.use(passport.initialize());

// Setup request logging
app.use(morgan('combined', { stream: logger.stream }));

// MongoDB Connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ontrak';

mongoose.connect(mongoUri).then(() => {
  logger.info('Connected to MongoDB');
}).catch((error) => {
  logger.error('MongoDB connection error:', error);
  process.exit(1);
});

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.debug('New client connected', { socketId: socket.id });
  
  socket.on('disconnect', () => {
    logger.debug('Client disconnected', { socketId: socket.id });
  });
});

// Routes
app.get('/api/health', (req, res) => {
  logger.debug('Health check request received');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/templates', passport.authenticate('jwt', { session: false }), require('./routes/template.routes'));
app.use('/api/schedules', passport.authenticate('jwt', { session: false }), require('./routes/schedule.routes'));
app.use('/api/logs', require('./routes/logs.routes'));

const PORT = process.env.PORT || 3456;
server.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
}); 