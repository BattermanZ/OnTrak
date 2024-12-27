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
  }
}, {
  timestamps: true
});

const templateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  days: {
    type: Number,
    required: true,
    min: 1
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  activities: [activitySchema]
}, {
  timestamps: true
});

// Add index for faster queries
templateSchema.index({ userId: 1, createdAt: -1 });

const Template = mongoose.model('Template', templateSchema);

module.exports = Template; 