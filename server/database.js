const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const dbPath = path.resolve(__dirname, '..', 'instance', 'ontrak.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    process.stderr.write(`Error connecting to the database: ${err.message}\n`);
  } else {
    process.stderr.write('Connected to the SQLite database.\n');
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

    process.stderr.write('Database tables created or already exist.\n');
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

// Time deviation analysis functions
function getTimeDeviationPerActivity(templateId) {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        a.name,
        a.duration as planned_duration,
        AVG(a.actual_duration) as avg_actual_duration,
        AVG(a.actual_duration - a.duration) as avg_time_deviation
      FROM Activity a
      JOIN Session s ON a.template_id = s.template_id
      WHERE a.template_id = ? AND a.completed = 1
      GROUP BY a.id
      ORDER BY avg_time_deviation DESC
    `, [templateId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getAverageTimeDeviation(templateId) {
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT AVG(a.actual_duration - a.duration) as avg_time_deviation
      FROM Activity a
      JOIN Session s ON a.template_id = s.template_id
      WHERE a.template_id = ? AND a.completed = 1
    `, [templateId], (err, row) => {
      if (err) reject(err);
      else resolve(row ? row.avg_time_deviation : 0);
    });
  });
}

function getCumulativeTimeImpact(templateId) {
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT SUM(a.actual_duration - a.duration) as cumulative_time_impact
      FROM Activity a
      JOIN Session s ON a.template_id = s.template_id
      WHERE a.template_id = ? AND a.completed = 1
    `, [templateId], (err, row) => {
      if (err) reject(err);
      else resolve(row ? row.cumulative_time_impact : 0);
    });
  });
}

function getDayByDayTimeDeviation(templateId) {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        a.day,
        AVG(a.actual_duration - a.duration) as avg_time_deviation
      FROM Activity a
      JOIN Session s ON a.template_id = s.template_id
      WHERE a.template_id = ? AND a.completed = 1
      GROUP BY a.day
      ORDER BY a.day
    `, [templateId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Consolidated statistics function
function getStatistics(templateId) {
  return Promise.all([
    getTimeDeviationPerActivity(templateId),
    getAverageTimeDeviation(templateId),
    getCumulativeTimeImpact(templateId),
    getDayByDayTimeDeviation(templateId)
  ]).then(results => {
    // Add debugging information
    process.stderr.write(`Debug - Statistics results: ${JSON.stringify(results)}\n`);
    process.stdout.write(JSON.stringify(results));
    return results;
  }).catch(err => {
    process.stderr.write(JSON.stringify({ error: err.message }));
    throw err;
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
        process.stderr.write(`Error testing database connection: ${err.message}\n`);
        reject(err);
      } else {
        process.stderr.write(`Database connection test result: ${JSON.stringify(row)}\n`);
        resolve(row);
      }
    });
  });
}

// Log the actual database path being used
process.stderr.write(`Database path: ${dbPath}\n`);

// Export database operations
module.exports = {
  createTemplate,
  getTemplates,
  createActivity,
  getActivitiesForTemplate,
  createSession,
  getSessions,
  updateSessionActivity,
  getTimeDeviationPerActivity,
  getAverageTimeDeviation,
  getCumulativeTimeImpact,
  getDayByDayTimeDeviation,
  getStatistics,
  checkTemplateData,
  testDatabaseConnection
};