const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const dbPath = path.resolve(__dirname, '..', 'instance', 'ontrak.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error(`Error connecting to the database: ${err.message}`);
  } else {
    console.log('Connected to the SQLite database.');
    initDatabase();
  }
});

// Initialize database tables
function initDatabase() {
  db.serialize(() => {
    // Create Template table
    db.run(`CREATE TABLE IF NOT EXISTS Template (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      duration INTEGER NOT NULL
    )`);

    // Create Activity table
    db.run(`CREATE TABLE IF NOT EXISTS Activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL,
      day INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      start_time TIME NOT NULL,
      duration INTEGER NOT NULL,
      completed BOOLEAN DEFAULT FALSE,
      actual_start_time DATETIME,
      actual_end_time DATETIME,
      actual_duration INTEGER,
      FOREIGN KEY (template_id) REFERENCES Template(id)
    )`);

    // Create Session table
    db.run(`CREATE TABLE IF NOT EXISTS Session (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      current_day INTEGER DEFAULT 1,
      day_started BOOLEAN DEFAULT FALSE,
      current_activity_id INTEGER,
      start_date DATE DEFAULT CURRENT_DATE,
      end_date DATE,
      FOREIGN KEY (template_id) REFERENCES Template(id),
      FOREIGN KEY (current_activity_id) REFERENCES Activity(id)
    )`);

    console.log('Database tables created or already exist.');
  });
}

// Template operations
function createTemplate(name, description, duration) {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO Template (name, description, duration) VALUES (?, ?, ?)', [name, description, duration], function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

function getTemplates() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM Template', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getTemplateById(templateId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM Template WHERE id = ?', [templateId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Activity operations
function createActivity(templateId, day, name, description, startTime, duration) {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO Activity (template_id, day, name, description, start_time, duration) VALUES (?, ?, ?, ?, ?, ?)',
      [templateId, day, name, description, startTime, duration],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

function getActivitiesForTemplate(templateId) {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM Activity WHERE template_id = ? ORDER BY day, start_time', [templateId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Session operations
function createSession(templateId, name) {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO Session (template_id, name) VALUES (?, ?)', [templateId, name], function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

function getSessions() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM Session', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function updateSessionActivity(sessionId, activityId) {
  return new Promise((resolve, reject) => {
    db.run('UPDATE Session SET current_activity_id = ? WHERE id = ?', [activityId, sessionId], function(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

// Detailed statistics function
function getDetailedStatistics(templateId, day) {
  return new Promise((resolve, reject) => {
    let query = `
      SELECT 
        a.name,
        a.duration as planned_duration,
        a.actual_duration,
        a.day
      FROM Activity a
      WHERE a.template_id = ? AND a.completed = 1
    `;
    
    const params = [templateId];
    if (day !== null) {
      query += ' AND a.day = ?';
      params.push(day);
    }
    
    db.all(query, params, (err, activities) => {
      if (err) {
        console.error('Database query error:', err);
        reject(err);
      } else {
        try {
          const totalActivities = activities.length;
          const timeDeviations = activities.map(a => (a.actual_duration || 0) - a.planned_duration);
          const averageTimeDeviation = totalActivities > 0 ? timeDeviations.reduce((sum, dev) => sum + dev, 0) / totalActivities : 0;
          const cumulativeTimeImpact = timeDeviations.reduce((sum, dev) => sum + dev, 0);
          
          const result = {
            total_activities: totalActivities,
            average_time_deviation: averageTimeDeviation,
            cumulative_time_impact: cumulativeTimeImpact,
            activities: activities.map(a => ({
              name: a.name,
              planned_duration: a.planned_duration,
              actual_duration: a.actual_duration || 0
            }))
          };
          
          // Log only a summary of the statistics
          console.log(JSON.stringify({
            total_activities: result.total_activities,
            average_time_deviation: result.average_time_deviation,
            cumulative_time_impact: result.cumulative_time_impact,
            activities_count: result.activities.length
          }));
          
          resolve(result);
        } catch (error) {
          console.error('Error processing statistics:', error);
          reject(error);
        }
      }
    });
  });
}

// Check for data in a template
function checkTemplateData(templateId) {
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT COUNT(*) as count
      FROM Activity
      WHERE template_id = ? AND completed = 1
    `, [templateId], (err, row) => {
      if (err) reject(err);
      else resolve(row.count);
    });
  });
}

// Test database connection
function testDatabaseConnection() {
  return new Promise((resolve, reject) => {
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='Template'", (err, row) => {
      if (err) {
        console.error(`Error testing database connection: ${err.message}`);
        reject(err);
      } else {
        console.log(`Database connection test result: ${JSON.stringify(row)}`);
        resolve(row);
      }
    });
  });
}

// Log the actual database path being used
console.log(`Database path: ${dbPath}`);

// Export database operations
module.exports = {
  createTemplate,
  getTemplates,
  getTemplateById,
  createActivity,
  getActivitiesForTemplate,
  createSession,
  getSessions,
  updateSessionActivity,
  getDetailedStatistics,
  checkTemplateData,
  testDatabaseConnection
};