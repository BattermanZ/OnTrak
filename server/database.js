const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const dbPath = path.resolve(__dirname, '..', 'ontrak.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
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
      if (err) {
        reject(err);
      } else {
        resolve(this.lastID);
      }
    });
  });
}

function getTemplates() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM Template', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Activity operations
function createActivity(templateId, day, name, description, startTime, duration) {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO Activity (template_id, day, name, description, start_time, duration) VALUES (?, ?, ?, ?, ?, ?)',
      [templateId, day, name, description, startTime, duration],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
}

function getActivitiesForTemplate(templateId) {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM Activity WHERE template_id = ? ORDER BY day, start_time', [templateId], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Session operations
function createSession(templateId, name) {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO Session (template_id, name) VALUES (?, ?)', [templateId, name], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this.lastID);
      }
    });
  });
}

function getSessions() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM Session', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

function updateSessionActivity(sessionId, activityId) {
  return new Promise((resolve, reject) => {
    db.run('UPDATE Session SET current_activity_id = ? WHERE id = ?', [activityId, sessionId], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this.changes);
      }
    });
  });
}

// Export database operations
module.exports = {
  db,
  createTemplate,
  getTemplates,
  createActivity,
  getActivitiesForTemplate,
  createSession,
  getSessions,
  updateSessionActivity
};