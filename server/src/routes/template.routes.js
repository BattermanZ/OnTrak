const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const templateController = require('../controllers/template.controller');

// Get all templates
router.get('/', authenticate, templateController.getAllTemplates);

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