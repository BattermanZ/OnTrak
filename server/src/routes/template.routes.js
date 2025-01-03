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

// Add activity to template
router.post('/:id/activities', templateController.addActivity);

// Delete template
router.delete('/:id', templateController.deleteTemplate);

module.exports = router; 