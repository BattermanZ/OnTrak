const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../config/logger');

// Retention rules for different backup types
const retentionRules = {
  daily: 14,          // 14 days
  weekly: 12 * 7,     // 12 weeks
  monthly: 365,       // 1 year
  yearly: Infinity,   // permanent
  manual: 30,         // 30 days default for manual backups
  manualKeepCount: 5  // always keep last 5 manual backups
};

/**
 * Determine backup type based on date
 * @param {Date} date The date to check
 * @param {boolean} isManual Whether this is a manual backup
 * @returns {'manual'|'yearly'|'monthly'|'weekly'|'daily'} The backup type
 */
const getBackupType = (date, isManual = false) => {
  if (isManual) return 'manual';
  if (date.getMonth() === 0 && date.getDate() === 1) return 'yearly';
  if (date.getDate() === 1) return 'monthly';
  if (date.getDay() === 1) return 'weekly';
  return 'daily';
};

/**
 * Check if a backup should be kept based on retention rules
 * @param {Object} backup The backup object to check
 * @param {Array} allBackups All available backups
 * @returns {boolean} Whether the backup should be kept
 */
const shouldKeepBackup = (backup, allBackups) => {
  const age = Math.floor((new Date() - new Date(backup.createdAt)) / (1000 * 60 * 60 * 24));
  
  // For manual backups, check if it's one of the last 5
  if (backup.type === 'manual') {
    const manualBackups = allBackups
      .filter(b => b.type === 'manual')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const isInLastFive = manualBackups.indexOf(backup) < retentionRules.manualKeepCount;
    return isInLastFive || age <= retentionRules.manual;
  }

  // For automatic backups, check against retention period
  return age <= retentionRules[backup.type];
};

class DatabaseBackup {
  constructor() {
    this.backupDir = path.join(__dirname, '../../../backups');
    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async createBackup(isManual = false) {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    const backupType = getBackupType(now, isManual);
    const fileName = `backup-${backupType}-${timestamp}.gz`;
    const filePath = path.join(this.backupDir, fileName);

    logger.info(`Starting database backup: ${fileName}`);

    try {
      const uri = process.env.MONGODB_URI || 'mongodb://mongodb:27017/ontrak';
      const { host, port, database } = this.parseMongoUri(uri);

      const mongodump = spawn('mongodump', [
        `--host=${host}`,
        `--port=${port}`,
        `--db=${database}`,
        `--archive=${filePath}`,
        '--gzip'
      ]);

      return new Promise((resolve, reject) => {
        mongodump.stdout.on('data', (data) => {
          logger.debug(`mongodump stdout: ${data}`);
        });

        mongodump.stderr.on('data', (data) => {
          logger.debug(`mongodump stderr: ${data}`);
        });

        mongodump.on('close', (code) => {
          if (code === 0) {
            logger.info(`Database backup completed successfully: ${fileName}`);
            resolve({
              success: true,
              fileName,
              path: filePath,
              timestamp: now.toISOString(),
              type: backupType
            });
          } else {
            const error = `Database backup failed with code ${code}`;
            logger.error(error);
            reject(new Error(error));
          }
        });

        mongodump.on('error', (error) => {
          logger.error('Failed to start backup process:', error);
          reject(error);
        });
      });
    } catch (error) {
      logger.error('Error during backup:', error);
      throw error;
    }
  }

  async listBackups() {
    try {
      const files = await fs.promises.readdir(this.backupDir);
      const backups = files
        .filter(file => file.startsWith('backup-') && file.endsWith('.gz'))
        .map(file => {
          const stats = fs.statSync(path.join(this.backupDir, file));
          const match = file.match(/backup-(manual|auto|daily|weekly|monthly|yearly)-/);
          const type = match ? match[1] : 'daily';
          return {
            fileName: file,
            size: stats.size,
            createdAt: stats.birthtime,
            type: type,
            retentionDays: type === 'yearly' ? Infinity : retentionRules[type]
          };
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      return backups;
    } catch (error) {
      logger.error('Error listing backups:', error);
      throw error;
    }
  }

  async deleteBackup(fileName) {
    try {
      const filePath = path.join(this.backupDir, fileName);
      await fs.promises.unlink(filePath);
      logger.info(`Backup deleted: ${fileName}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting backup ${fileName}:`, error);
      throw error;
    }
  }

  // Helper method to parse MongoDB URI
  parseMongoUri(uri) {
    const regex = /mongodb:\/\/([^:]+):(\d+)\/([^?]+)/;
    const matches = uri.match(regex);
    if (!matches) {
      throw new Error('Invalid MongoDB URI format');
    }
    return {
      host: matches[1],
      port: matches[2],
      database: matches[3]
    };
  }

  // Clean up old backups based on retention rules
  async cleanOldBackups() {
    try {
      const backups = await this.listBackups();
      
      for (const backup of backups) {
        if (!shouldKeepBackup(backup, backups)) {
          await this.deleteBackup(backup.fileName);
          logger.info(`Deleted old backup: ${backup.fileName}`);
        }
      }
    } catch (error) {
      logger.error('Error cleaning old backups:', error);
      throw error;
    }
  }

  async restoreBackup(fileName) {
    const filePath = path.join(this.backupDir, fileName);
    
    if (!fs.existsSync(filePath)) {
      throw new Error('Backup file not found');
    }

    logger.info(`Starting database restore from backup: ${fileName}`);

    try {
      const uri = process.env.MONGODB_URI || 'mongodb://mongodb:27017/ontrak';
      const { host, port, database } = this.parseMongoUri(uri);

      const mongorestore = spawn('mongorestore', [
        `--host=${host}`,
        `--port=${port}`,
        `--db=${database}`,
        `--drop`, // Drop existing collections before restore
        `--gzip`,
        `--archive=${filePath}`
      ]);

      return new Promise((resolve, reject) => {
        mongorestore.stdout.on('data', (data) => {
          logger.debug(`mongorestore stdout: ${data}`);
        });

        mongorestore.stderr.on('data', (data) => {
          logger.debug(`mongorestore stderr: ${data}`);
        });

        mongorestore.on('close', (code) => {
          if (code === 0) {
            logger.info(`Database restored successfully from backup: ${fileName}`);
            resolve({
              success: true,
              message: 'Database restored successfully'
            });
          } else {
            const error = `Database restore failed with code ${code}`;
            logger.error(error);
            reject(new Error(error));
          }
        });

        mongorestore.on('error', (error) => {
          logger.error('Failed to start restore process:', error);
          reject(error);
        });
      });
    } catch (error) {
      logger.error('Error during restore:', error);
      throw error;
    }
  }
}

module.exports = new DatabaseBackup(); 