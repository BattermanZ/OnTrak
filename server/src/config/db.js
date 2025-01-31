const mongoose = require('mongoose');
const path = require('path');
const winston = require('./winston');

const dbPath = path.join(process.cwd(), '..', 'database', 'data');
const logPath = path.join(process.cwd(), '..', 'logs', 'app.log');

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      dbName: 'ontrak',
      directoryPerDB: true,
      dbPath: dbPath
    });
    winston.info('Connected to MongoDB');
  } catch (error) {
    winston.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB; 