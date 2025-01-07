const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  startTime: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true,
    min: 1
  },
  description: {
    type: String,
    trim: true
  },
  day: {
    type: Number,
    required: true,
    min: 1
  },
  completed: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: false
  },
  actualStartTime: {
    type: Date,
    default: null
  },
  actualEndTime: {
    type: Date,
    default: null
  }
});

const scheduleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template',
    required: true
  },
  selectedDay: {
    type: Number,
    required: true,
    min: 1
  },
  activities: [activitySchema],
  activeActivityIndex: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Methods to get activities
scheduleSchema.methods.getCurrentActivity = function() {
  return this.activities[this.activeActivityIndex] || null;
};

scheduleSchema.methods.getPreviousActivity = function() {
  return this.activeActivityIndex > 0 ? this.activities[this.activeActivityIndex - 1] : null;
};

scheduleSchema.methods.getNextActivity = function() {
  return this.activeActivityIndex < this.activities.length - 1 
    ? this.activities[this.activeActivityIndex + 1] 
    : null;
};

// Method to advance to next activity
scheduleSchema.methods.advanceToNextActivity = function() {
  if (this.activeActivityIndex >= this.activities.length - 1) return false;
  
  // Mark current activity as completed
  this.activities[this.activeActivityIndex].completed = true;
  this.activities[this.activeActivityIndex].isActive = false;
  
  // Move to next activity
  this.activeActivityIndex += 1;
  this.activities[this.activeActivityIndex].isActive = true;
  
  return true;
};

// Method to go back to previous activity
scheduleSchema.methods.goToPreviousActivity = function() {
  if (this.activeActivityIndex <= 0) return false;
  
  // Mark current activity as not completed
  this.activities[this.activeActivityIndex].isActive = false;
  
  // Move to previous activity
  this.activeActivityIndex -= 1;
  this.activities[this.activeActivityIndex].isActive = true;
  this.activities[this.activeActivityIndex].completed = false;
  
  return true;
};

const Schedule = mongoose.model('Schedule', scheduleSchema);

module.exports = Schedule; 