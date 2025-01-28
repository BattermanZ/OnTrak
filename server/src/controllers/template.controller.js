const Template = require('../models/template.model');
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
      user: req.user?._id
    });

    const { name, days, tags } = req.body;
    
    if (!req.user?._id) {
      logger.error('User not found in request');
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const template = new Template({
      name,
      days,
      tags: tags || [],
      createdBy: req.user._id,
      activities: []
    });
    
    logger.debug('Saving template', { template });
    const newTemplate = await template.save();
    
    const populatedTemplate = await Template.findById(newTemplate._id)
      .populate('createdBy', 'firstName lastName email');
    
    logger.debug('Template created successfully', { template: populatedTemplate });
    res.status(201).json(populatedTemplate);
  } catch (error) {
    logger.error('Error creating template', { error: error.message });
    res.status(400).json({ message: error.message });
  }
};

// Clone template
const cloneTemplate = async (req, res) => {
  try {
    const sourceTemplate = await Template.findById(req.params.id);
    if (!sourceTemplate) {
      return res.status(404).json({ message: 'Template not found' });
    }

    const { name } = req.body;
    const clonedTemplate = new Template({
      name: name || `${sourceTemplate.name} (Copy)`,
      days: sourceTemplate.days,
      tags: sourceTemplate.tags,
      createdBy: req.user._id,
      activities: sourceTemplate.activities
    });

    const newTemplate = await clonedTemplate.save();
    const populatedTemplate = await Template.findById(newTemplate._id)
      .populate('createdBy', 'firstName lastName email');

    res.status(201).json(populatedTemplate);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Import template
const importTemplate = async (req, res) => {
  try {
    const templateData = req.body;
    
    // Validate the imported data structure
    if (!templateData.name || !templateData.days || !Array.isArray(templateData.activities)) {
      return res.status(400).json({ message: 'Invalid template data structure' });
    }

    const template = new Template({
      ...templateData,
      createdBy: req.user._id,
      tags: templateData.tags || []
    });

    const newTemplate = await template.save();
    const populatedTemplate = await Template.findById(newTemplate._id)
      .populate('createdBy', 'firstName lastName email');

    res.status(201).json(populatedTemplate);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Export template
const exportTemplate = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email');
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Create a clean version of the template for export
    const exportData = {
      name: template.name,
      days: template.days,
      tags: template.tags,
      activities: template.activities
    };

    res.json(exportData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update template
const updateTemplate = async (req, res) => {
  try {
    logger.debug('Updating template', { templateId: req.params.id, updates: req.body });
    
    const { name, days, activities, tags } = req.body;
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    template.name = name;
    template.days = days;
    if (tags !== undefined) {
      template.tags = tags;
    }
    if (activities) {
      template.activities = activities;
    }

    await template.save();
    
    const updatedTemplate = await Template.findById(template._id)
      .populate('createdBy', 'firstName lastName email');
    
    logger.debug('Template updated successfully', { template: updatedTemplate });
    res.json(updatedTemplate);
  } catch (error) {
    logger.error('Error updating template', { error: error.message });
    res.status(400).json({ message: error.message });
  }
};

// Add activities in bulk
const addActivitiesBulk = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    const { activities } = req.body;
    if (!Array.isArray(activities)) {
      return res.status(400).json({ message: 'Activities must be an array' });
    }

    // Validate all activities before adding
    for (const activity of activities) {
      if (!activity.name || !activity.startTime || !activity.duration || !activity.day) {
        return res.status(400).json({ 
          message: 'Each activity must have name, startTime, duration, and day' 
        });
      }

      if (activity.day < 1 || activity.day > template.days) {
        return res.status(400).json({ 
          message: `Day must be between 1 and ${template.days}` 
        });
      }

      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(activity.startTime)) {
        return res.status(400).json({ 
          message: 'Invalid time format. Please use HH:MM format (e.g., 09:00)' 
        });
      }
    }

    template.activities.push(...activities);
    await template.save();

    const updatedTemplate = await Template.findById(template._id)
      .populate('createdBy', 'firstName lastName email');

    res.json(updatedTemplate);
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

    const { name, startTime, duration, description, day } = req.body;

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime)) {
      return res.status(400).json({ message: 'Invalid time format. Please use HH:MM format (e.g., 09:00)' });
    }

    // Validate day
    if (day < 1 || day > template.days) {
      return res.status(400).json({ message: `Day must be between 1 and ${template.days}` });
    }

    template.activities.push({
      name,
      startTime,
      duration,
      description,
      day
    });

    await template.save();
    
    const updatedTemplate = await Template.findById(template._id)
      .populate('createdBy', 'firstName lastName email');
    
    res.json(updatedTemplate);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update activity
const updateActivity = async (req, res) => {
  try {
    logger.debug('Updating activity', { 
      templateId: req.params.id, 
      activityId: req.params.activityId,
      updates: req.body 
    });
    
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    const activityIndex = template.activities.findIndex(
      activity => activity._id.toString() === req.params.activityId
    );

    if (activityIndex === -1) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    const { name, startTime, duration, description, day } = req.body;

    // Validate time format if provided
    if (startTime) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(startTime)) {
        return res.status(400).json({ message: 'Invalid time format. Please use HH:MM format (e.g., 09:00)' });
      }
    }

    // Validate day if provided
    if (day && (day < 1 || day > template.days)) {
      return res.status(400).json({ message: `Day must be between 1 and ${template.days}` });
    }

    // Update activity
    template.activities[activityIndex] = {
      ...template.activities[activityIndex],
      name: name || template.activities[activityIndex].name,
      startTime: startTime || template.activities[activityIndex].startTime,
      duration: duration || template.activities[activityIndex].duration,
      description: description !== undefined ? description : template.activities[activityIndex].description,
      day: day || template.activities[activityIndex].day
    };

    await template.save();
    
    const updatedTemplate = await Template.findById(template._id)
      .populate('createdBy', 'firstName lastName email');
    
    res.json(updatedTemplate);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete template (admin only)
const deleteTemplate = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can delete templates' });
    }

    const template = await Template.findByIdAndDelete(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    logger.info('Template deleted by admin', {
      templateId: template._id,
      templateName: template.name,
      adminId: req.user._id,
      adminName: `${req.user.firstName} ${req.user.lastName}`
    });

    res.json({ message: 'Template deleted' });
  } catch (error) {
    logger.error('Error deleting template:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  cloneTemplate,
  importTemplate,
  exportTemplate,
  updateTemplate,
  addActivitiesBulk,
  addActivity,
  updateActivity,
  deleteTemplate
}; 