const Template = require('../models/template.model');
const { checkActivityConflicts } = require('../utils/activityConflicts');

// Get all templates
const getAllTemplates = async (req, res) => {
  try {
    const templates = await Template.find();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get template by ID
const getTemplateById = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
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
    const template = new Template({
      name: req.body.name,
      days: req.body.days,
      createdBy: req.user._id,
      category: req.body.category || '',
      tags: req.body.tags || []
    });
    const newTemplate = await template.save();
    res.status(201).json(newTemplate);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update template
const updateTemplate = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    Object.assign(template, req.body);
    const updatedTemplate = await template.save();
    res.json(updatedTemplate);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete template
const deleteTemplate = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    await template.remove();
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
      createdBy: req.user._id
    });

    const newTemplate = await duplicateTemplate.save();
    res.status(201).json(newTemplate);
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

    template.activities.push(req.body);
    const conflicts = checkActivityConflicts(template.activities);
    
    if (conflicts.length > 0) {
      return res.status(400).json({ 
        message: 'Activity conflicts detected',
        conflicts 
      });
    }

    const updatedTemplate = await template.save();
    res.status(201).json(updatedTemplate);
  } catch (error) {
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
  deleteActivity
}; 