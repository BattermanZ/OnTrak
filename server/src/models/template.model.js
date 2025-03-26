const mongoose = require('mongoose');
const Schedule = require('./schedule.model');
const logger = require('../config/logger');

const activitySchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true // This will auto-generate _id for new activities
  },
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
  actualStartTime: {
    type: String,
    default: null
  },
  actualEndTime: {
    type: String,
    default: null
  }
}, { _id: false }); // This ensures we can control _id generation

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
  tags: {
    type: [String],
    default: [],
    validate: {
      validator: function(v) {
        return v.length <= 5; // Maximum 5 tags per template
      },
      message: 'A template can have at most 5 tags'
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  activities: [activitySchema]
}, {
  timestamps: true
});

// Add pre-save hook to handle activities without _id
templateSchema.pre('save', function(next) {
  if (this.isModified('activities')) {
    this.activities = this.activities.map(activity => {
      if (!activity._id) {
        activity._id = new mongoose.Types.ObjectId();
      }
      return activity;
    });
  }
  next();
});

// Add pre-delete hook
templateSchema.pre('findOneAndDelete', async function(next) {
  try {
    const template = await this.model.findOne(this.getQuery());
    if (template) {
      // Find and update all associated schedules
      const result = await Schedule.updateMany(
        { templateId: template._id },
        { 
          $set: { 
            status: 'cancelled',
            title: `${template.name} (Template Deleted)`
          }
        }
      );
      
      logger.info('Updated schedules after template deletion', {
        templateId: template._id,
        templateName: template.name,
        schedulesUpdated: result.modifiedCount
      });
    }
    next();
  } catch (error) {
    logger.error('Error in template pre-delete hook:', error);
    next(error);
  }
});

const Template = mongoose.model('Template', templateSchema);

module.exports = Template; 