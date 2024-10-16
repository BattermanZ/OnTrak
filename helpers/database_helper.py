import sqlite3
import os
from helpers.logging_helper import LoggingHelper

class DatabaseHelper:
    def __init__(self, db_dir='database', db_file='activities.db'):
        """
        Initialize the database helper with the database directory and file name.
        """
        self.db_path = os.path.join(db_dir, db_file)
        self.logger = LoggingHelper()
        self._configure_database()

    def _configure_database(self):
        """
        Configure the database by creating the necessary directory and tables if they do not exist.
        """
        try:
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            with sqlite3.connect(self.db_path) as conn:
                conn.execute('''
                    CREATE TABLE IF NOT EXISTS activities (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        duration INTEGER NOT NULL,
                        description TEXT,
                        start_time TEXT NOT NULL,
                        end_time TEXT NOT NULL,
                        day TEXT NOT NULL
                    )
                ''')
                conn.execute('''
                    CREATE TABLE IF NOT EXISTS activity_statuses (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id TEXT NOT NULL,
                        activity_id INTEGER NOT NULL,
                        status TEXT DEFAULT 'pending',
                        FOREIGN KEY (activity_id) REFERENCES activities (id)
                    )
                ''')
                self.logger.log_info("Database configured successfully.")
        except Exception as e:
            self.logger.log_error("Error configuring the database.", exc_info=True)

    def _execute_query(self, query, params=(), fetch_one=False, fetch_all=False):
        """
        Execute a SQL query with optional parameters and return results if needed.
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute(query, params)
                self.logger.log_debug(f"Executing query: {query} | Params: {params}")
                if fetch_one:
                    return cursor.fetchone()
                if fetch_all:
                    return cursor.fetchall() or []
        except sqlite3.Error as e:
            self.logger.log_error(f"Database query error: {str(e)}", exc_info=True)
            return []

    def get_activities(self):
        """ Get all activities from the database. """
        return self._execute_query('SELECT * FROM activities', fetch_all=True)

    def get_activities_by_day(self, day):
        """ Get all activities for a specific day, ordered by start time. """
        return self._execute_query('SELECT * FROM activities WHERE day = ? ORDER BY start_time ASC', (day,), fetch_all=True)

    def get_activity_by_id(self, activity_id):
        """ Get a specific activity by its ID. """
        return self._execute_query('SELECT * FROM activities WHERE id = ?', (activity_id,), fetch_one=True)

    def insert_activity(self, name, duration, description, start_time, end_time, day):
        """ Insert a new activity into the database. """
        self._execute_query('''
            INSERT INTO activities (name, duration, description, start_time, end_time, day)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (name, duration, description, start_time, end_time, day))

    def update_activity(self, activity_id, name, duration, description, start_time, end_time, day):
        """ Update an existing activity in the database. """
        self._execute_query('''
            UPDATE activities
            SET name = ?, duration = ?, description = ?, start_time = ?, end_time = ?, day = ?
            WHERE id = ?
        ''', (name, duration, description, start_time, end_time, day, activity_id))

    def delete_activity(self, activity_id):
        """ Delete an activity from the database by its ID. """
        self._execute_query('DELETE FROM activities WHERE id = ?', (activity_id,))
        self._execute_query('DELETE FROM activity_statuses WHERE activity_id = ?', (activity_id,))

    def get_next_activity(self, day, current_time):
        """ Get the next activity for a specific day based on the current time. """
        return self._execute_query(
            'SELECT * FROM activities WHERE day = ? AND start_time > ? ORDER BY start_time ASC LIMIT 1',
            (day, current_time),
            fetch_one=True
        )

    def get_activity_statuses(self, user_id):
        """ Get the status of all activities for a specific user. """
        return self._execute_query('SELECT activity_id, status FROM activity_statuses WHERE user_id = ?', (user_id,), fetch_all=True)

    def update_activity_status(self, user_id, activity_id, status):
        """ Update the status of an activity for a specific user. """
        existing_status = self._execute_query(
            'SELECT * FROM activity_statuses WHERE user_id = ? AND activity_id = ?',
            (user_id, activity_id),
            fetch_one=True
        )
        if existing_status:
            self._execute_query('''
                UPDATE activity_statuses
                SET status = ?
                WHERE user_id = ? AND activity_id = ?
            ''', (status, user_id, activity_id))
        else:
            self._execute_query('''
                INSERT INTO activity_statuses (user_id, activity_id, status)
                VALUES (?, ?, ?)
            ''', (user_id, activity_id, status))

# Example usage
if __name__ == "__main__":
    db_helper = DatabaseHelper()
    # Insert a sample activity (shared among all users)
    db_helper.insert_activity("Sample Activity", 60, "Description", "09:00", "10:00", "Day 1")
    activities = db_helper.get_activities()
    for activity in activities:
        print(activity)