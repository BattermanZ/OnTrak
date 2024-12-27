const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const templateController = require('../controllers/template.controller');
const logger = require('../config/logger');

// Get all templates
router.get('/', authenticate, templateController.getAllTemplates);

// Get categories
router.get('/categories', authenticate, async (req, res) => {
  try {
    // For now, return an empty array as categories are not yet implemented
    logger.debug('Categories requested');
    res.json([]);
  } catch (error) {
    logger.error('Error fetching categories', { error: error.message });
    res.status(500).json({ message: 'Error fetching categories' });
  }
});

// Get tags
router.get('/tags', authenticate, async (req, res) => {
  try {
    // For now, return an empty array as tags are not yet implemented
    logger.debug('Tags requested');
    res.json([]);
  } catch (error) {
    logger.error('Error fetching tags', { error: error.message });
    res.status(500).json({ message: 'Error fetching tags' });
  }
});

// Search templates
router.get('/search', authenticate, async (req, res) => {
  try {
    const { query, category, tags } = req.query;
    logger.debug('Search requested', { query, category, tags });
    
    // For now, return all templates as search is not yet implemented
    const templates = await templateController.getAllTemplates(req, res);
    res.json(templates);
  } catch (error) {
    logger.error('Error searching templates', { error: error.message });
    res.status(500).json({ message: 'Error searching templates' });
  }
});

// Get a specific template
router.get('/:id', authenticate, templateController.getTemplateById);

// Create a new template
router.post('/', authenticate, templateController.createTemplate);

// Update a template
router.put('/:id', authenticate, templateController.updateTemplate);

// Delete a template
router.delete('/:id', authenticate, templateController.deleteTemplate);

// Duplicate a template
router.post('/:id/duplicate', authenticate, templateController.duplicateTemplate);

// Add activity to template
router.post('/:id/activities', authenticate, templateController.addActivity);

// Update activity in template
router.put('/:templateId/activities/:activityId', authenticate, templateController.updateActivity);

// Delete activity from template
router.delete('/:templateId/activities/:activityId', authenticate, templateController.deleteActivity);

module.exports = router; 