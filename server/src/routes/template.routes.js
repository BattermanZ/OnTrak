const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const templateController = require('../controllers/template.controller');
const logger = require('../config/logger');
const Template = require('../models/template.model');

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all templates
router.get('/', templateController.getAllTemplates);

// Get categories
router.get('/categories', templateController.getCategories);

// Get tags
router.get('/tags', templateController.getTags);

// Search templates
router.get('/search', async (req, res) => {
  try {
    const { query, category, tags } = req.query;
    logger.debug('Search requested', { query });
    
    const searchQuery = {};
    
    if (query) {
      searchQuery.name = { $regex: query, $options: 'i' };
    }
    
    if (category && category.trim()) {
      searchQuery.category = category.trim();
    }
    
    if (tags && tags.length > 0) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      searchQuery.tags = { 
        $all: tagArray.filter(tag => tag && tag.trim()).map(tag => tag.trim()) 
      };
    }

    const templates = await Template.find(searchQuery)
      .populate('createdBy', 'firstName lastName email');
    
    return res.json(templates);
  } catch (error) {
    logger.error('Error searching templates', { error: error.message });
    return res.status(500).json({ message: 'Error searching templates' });
  }
});

// Get template by ID
router.get('/:id', templateController.getTemplateById);

// Create template
router.post('/', templateController.createTemplate);

// Update template
router.put('/:id', templateController.updateTemplate);

// Delete template
router.delete('/:id', templateController.deleteTemplate);

// Duplicate template
router.post('/:id/duplicate', templateController.duplicateTemplate);

// Add activity to template
router.post('/:id/activities', templateController.addActivity);

// Update activity in template
router.put('/:id/activities/:activityId', templateController.updateActivity);

// Delete activity from template
router.delete('/:id/activities/:activityId', templateController.deleteActivity);

// Check conflicts in template
router.get('/:id/conflicts', async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    const conflicts = checkActivityConflicts(template.activities);
    res.json(conflicts);
  } catch (error) {
    logger.error('Error checking conflicts', { error: error.message });
    res.status(500).json({ message: 'Error checking conflicts' });
  }
});

// Export template as PDF
router.get('/:id/export-pdf', async (req, res) => {
  try {
    const template = await Template.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email');
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    // TODO: Implement PDF generation
    res.status(501).json({ message: 'PDF export not implemented yet' });
  } catch (error) {
    logger.error('Error exporting PDF', { error: error.message });
    res.status(500).json({ message: 'Error exporting PDF' });
  }
});

module.exports = router; 