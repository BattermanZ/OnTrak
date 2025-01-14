const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const templateController = require('../controllers/template.controller');

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all templates
router.get('/', templateController.getAllTemplates);

// Get template by ID
router.get('/:id', templateController.getTemplateById);

// Create template
router.post('/', templateController.createTemplate);

// Clone template
router.post('/:id/clone', templateController.cloneTemplate);

// Import template
router.post('/import', templateController.importTemplate);

// Export template
router.get('/:id/export', templateController.exportTemplate);

// Update template
router.put('/:id', templateController.updateTemplate);

// Add activities in bulk
router.post('/:id/activities/bulk', templateController.addActivitiesBulk);

// Add activity to template
router.post('/:id/activities', templateController.addActivity);

// Update activity
router.put('/:id/activities/:activityId', templateController.updateActivity);

// Delete template
router.delete('/:id', templateController.deleteTemplate);

module.exports = router; 