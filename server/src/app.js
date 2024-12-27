const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const passport = require('passport');
const winston = require('./config/winston');
const path = require('path');

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

// Middleware
app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// MongoDB Connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ontrak';

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  winston.info('Connected to MongoDB');
}).catch((error) => {
  winston.error('MongoDB connection error:', error);
  process.exit(1);
});

// Socket.io connection handling
io.on('connection', (socket) => {
  winston.info('New client connected');
  
  socket.on('disconnect', () => {
    winston.info('Client disconnected');
  });
});

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/templates', passport.authenticate('jwt', { session: false }), require('./routes/template.routes'));
app.use('/api/schedules', passport.authenticate('jwt', { session: false }), require('./routes/schedule.routes'));

const PORT = process.env.PORT || 3456;
server.listen(PORT, () => {
  winston.info(`Server is running on port ${PORT}`);
}); 