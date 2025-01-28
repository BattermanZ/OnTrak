const cron = require('node-cron');
const databaseBackup = require('./backup');
const logger = require('../config/logger');

class BackupScheduler {
  constructor() {
    // Schedule automatic backup daily at 2 AM
    this.backupJob = cron.schedule('0 2 * * *', async () => {
      logger.info('Starting scheduled database backup');
      try {
        const result = await databaseBackup.createBackup(false);
        logger.info('Scheduled backup completed successfully', { fileName: result.fileName });
        
        // Clean up old backups after successful backup
        await databaseBackup.cleanOldBackups();
      } catch (error) {
        logger.error('Scheduled backup failed:', error);
      }
    }, {
      scheduled: false,
      timezone: "Europe/Amsterdam"
    });
  }

  start() {
    this.backupJob.start();
    logger.info('Backup scheduler started');
  }

  stop() {
    this.backupJob.stop();
    logger.info('Backup scheduler stopped');
  }
}

module.exports = new BackupScheduler(); 