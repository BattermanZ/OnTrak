const express = require('express');
const router = express.Router();
const databaseBackup = require('../utils/backup');
const logger = require('../config/logger');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Only administrators can access backup operations' });
  }
  next();
};

// Create manual backup
router.post('/create', isAdmin, async (req, res) => {
  try {
    const result = await databaseBackup.createBackup(true);
    logger.info('Manual backup created', { fileName: result.fileName });
    res.json(result);
  } catch (error) {
    logger.error('Manual backup failed:', error);
    res.status(500).json({ message: 'Failed to create backup', error: error.message });
  }
});

// List all backups
router.get('/list', isAdmin, async (req, res) => {
  try {
    const backups = await databaseBackup.listBackups();
    res.json(backups);
  } catch (error) {
    logger.error('Failed to list backups:', error);
    res.status(500).json({ message: 'Failed to list backups', error: error.message });
  }
});

// Delete a backup
router.delete('/:fileName', isAdmin, async (req, res) => {
  try {
    await databaseBackup.deleteBackup(req.params.fileName);
    res.json({ message: 'Backup deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete backup:', error);
    res.status(500).json({ message: 'Failed to delete backup', error: error.message });
  }
});

// Restore from backup
router.post('/:fileName/restore', isAdmin, async (req, res) => {
  try {
    await databaseBackup.restoreBackup(req.params.fileName);
    logger.info('Backup restored successfully', { fileName: req.params.fileName });
    res.json({ message: 'Backup restored successfully' });
  } catch (error) {
    logger.error('Failed to restore backup:', error);
    res.status(500).json({ message: 'Failed to restore backup', error: error.message });
  }
});

module.exports = router; 