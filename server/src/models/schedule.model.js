const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  trainer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  sessions: [{
    date: {
      type: Date,
      required: true
    },
    startTime: {
      type: String,
      required: true
    },
    endTime: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: String,
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'cancelled'],
      default: 'pending'
    },
    notes: String
  }],
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'cancelled'],
    default: 'draft'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Add index for efficient queries
scheduleSchema.index({ trainer: 1, startDate: 1 });
scheduleSchema.index({ status: 1 });

// Virtual for progress calculation
scheduleSchema.virtual('progress').get(function() {
  if (!this.sessions.length) return 0;
  
  const completedSessions = this.sessions.filter(
    session => session.status === 'completed'
  ).length;
  
  return (completedSessions / this.sessions.length) * 100;
});

const Schedule = mongoose.model('Schedule', scheduleSchema);

module.exports = Schedule; 