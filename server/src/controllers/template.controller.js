const Template = require('../models/template.model');
const { checkActivityConflicts } = require('../utils/activityConflicts');
const logger = require('../config/logger');

// Get all templates
const getAllTemplates = async (req, res) => {
  try {
    const templates = await Template.find()
      .populate('createdBy', 'firstName lastName email');
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get categories
const getCategories = async (req, res) => {
  try {
    const categories = await Template.distinct('category');
    res.json(categories.filter(category => category && category.trim()));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get tags
const getTags = async (req, res) => {
  try {
    const tags = await Template.distinct('tags');
    res.json(tags.filter(tag => tag && tag.trim()));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get template by ID
const getTemplateById = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email');
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    res.json(template);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new template
const createTemplate = async (req, res) => {
  try {
    logger.debug('Creating template', { 
      body: req.body,
      user: req.user?._id,
      headers: req.headers 
    });

    const { name, days, category, tags } = req.body;
    
    if (!req.user?._id) {
      logger.error('User not found in request');
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    // Validate and clean category and tags
    const cleanCategory = category ? category.trim() : '';
    const cleanTags = Array.isArray(tags) 
      ? tags.filter(tag => tag && tag.trim()).map(tag => tag.trim())
      : [];

    // Create template with user ID from auth middleware
    const template = new Template({
      name,
      days,
      createdBy: req.user._id,
      category: cleanCategory,
      tags: cleanTags,
      activities: []
    });
    
    logger.debug('Saving template', { template });
    const newTemplate = await template.save();
    
    // Populate the createdBy field before sending response
    const populatedTemplate = await Template.findById(newTemplate._id)
      .populate('createdBy', 'firstName lastName email');
    
    logger.debug('Template created successfully', { template: populatedTemplate });
    res.status(201).json(populatedTemplate);
  } catch (error) {
    logger.error('Error creating template', { 
      error: error.message,
      stack: error.stack
    });
    res.status(400).json({ message: error.message });
  }
};

// Update template
const updateTemplate = async (req, res) => {
  try {
    const { name, days, category, tags } = req.body;
    
    // Validate and clean category and tags
    const cleanCategory = category ? category.trim() : '';
    const cleanTags = Array.isArray(tags) 
      ? tags.filter(tag => tag && tag.trim()).map(tag => tag.trim())
      : [];

    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    template.name = name;
    template.days = days;
    template.category = cleanCategory;
    template.tags = cleanTags;
    
    const updatedTemplate = await template.save();
    const populatedTemplate = await Template.findById(updatedTemplate._id)
      .populate('createdBy', 'firstName lastName email');
    
    res.json(populatedTemplate);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete template
const deleteTemplate = async (req, res) => {
  try {
    const template = await Template.findByIdAndDelete(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    res.json({ message: 'Template deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Duplicate template
const duplicateTemplate = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    const duplicateTemplate = new Template({
      name: `${template.name} (Copy)`,
      days: template.days,
      activities: template.activities,
      createdBy: req.user._id,
      category: template.category,
      tags: template.tags
    });

    const newTemplate = await duplicateTemplate.save();
    const populatedTemplate = await Template.findById(newTemplate._id)
      .populate('createdBy', 'firstName lastName email');
    res.status(201).json(populatedTemplate);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Add activity to template
const addActivity = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Validate activity data
    const { name, startTime, duration, description, day } = req.body;
    
    if (!name || !startTime || !duration || !day) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime)) {
      return res.status(400).json({ message: 'Invalid time format. Please use HH:MM format (e.g., 09:00)' });
    }

    // Validate day is within template days range
    if (day < 1 || day > template.days) {
      return res.status(400).json({ message: `Day must be between 1 and ${template.days}` });
    }

    // Create new activity
    const newActivity = {
      name: name.trim(),
      startTime,
      duration: Math.max(1, duration),
      description: description ? description.trim() : '',
      day
    };

    // Check for conflicts before adding the activity
    const activitiesWithNew = [...template.activities, newActivity];
    const conflicts = checkActivityConflicts(activitiesWithNew);
    
    if (conflicts.length > 0) {
      return res.status(400).json({ 
        message: 'Activity conflicts detected',
        conflicts 
      });
    }

    // Add activity and save
    template.activities.push(newActivity);
    const updatedTemplate = await template.save();
    
    // Return the newly added activity
    const addedActivity = updatedTemplate.activities[updatedTemplate.activities.length - 1];
    res.status(201).json(addedActivity);
  } catch (error) {
    console.error('Error adding activity:', error);
    res.status(400).json({ message: error.message });
  }
};

// Update activity in template
const updateActivity = async (req, res) => {
  try {
    const template = await Template.findById(req.params.templateId);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    const activityIndex = template.activities.findIndex(
      activity => activity._id.toString() === req.params.activityId
    );

    if (activityIndex === -1) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    template.activities[activityIndex] = {
      ...template.activities[activityIndex],
      ...req.body
    };

    const conflicts = checkActivityConflicts(template.activities);
    if (conflicts.length > 0) {
      return res.status(400).json({ 
        message: 'Activity conflicts detected',
        conflicts 
      });
    }

    const updatedTemplate = await template.save();
    res.json(updatedTemplate);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete activity from template
const deleteActivity = async (req, res) => {
  try {
    const template = await Template.findById(req.params.templateId);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    template.activities = template.activities.filter(
      activity => activity._id.toString() !== req.params.activityId
    );

    const updatedTemplate = await template.save();
    res.json(updatedTemplate);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  addActivity,
  updateActivity,
  deleteActivity,
  getCategories,
  getTags
}; 