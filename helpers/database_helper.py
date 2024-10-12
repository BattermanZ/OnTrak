import sqlite3
import os
from datetime import datetime
from helpers.logging_helper import LoggingHelper

class DatabaseHelper:
    def __init__(self, db_dir='database', db_file='activities.db'):
        """
        Initialize the database helper with the database directory and file name.
        """
        self.db_dir = db_dir
        self.db_file = db_file
        self.logger = LoggingHelper()
        self._configure_database()

    def _configure_database(self):
        """
        Configure the database by creating the necessary directory and table if they do not exist.
        """
        try:
            if not os.path.exists(self.db_dir):
                os.makedirs(self.db_dir)
            with sqlite3.connect(self._get_db_path()) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS activities (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        duration INTEGER NOT NULL,
                        description TEXT,
                        start_time TEXT NOT NULL,
                        end_time TEXT NOT NULL,
                        day TEXT NOT NULL,
                        status TEXT NOT NULL DEFAULT 'not started',
                        start_timestamp TEXT,
                        end_timestamp TEXT,
                        time_spent INTEGER DEFAULT 0
                    )
                ''')
                conn.commit()
                self.logger.log_info("Database configured successfully.")
        except Exception as e:
            self.logger.log_error("Error configuring the database.", exc_info=True)

    def _get_db_path(self):
        """
        Get the full path to the database file.
        """
        return os.path.join(self.db_dir, self.db_file)

    def _execute_query(self, query, params=(), fetch_one=False, fetch_all=False):
        """
        Execute a SQL query with optional parameters and return results if needed.
        """
        try:
            with sqlite3.connect(self._get_db_path()) as conn:
                cursor = conn.cursor()
                self.logger.log_debug(f"Executing query: {query} | Params: {params}")
                cursor.execute(query, params)
                if fetch_one:
                    result = cursor.fetchone()
                    self.logger.log_debug(f"Query result (fetch_one): {result}")
                    return result
                elif fetch_all:
                    result = cursor.fetchall()
                    self.logger.log_debug(f"Query result (fetch_all): {result}")
                    return result
                conn.commit()
                self.logger.log_info(f"Query executed successfully: {query}")
        except sqlite3.Error as e:
            self.logger.log_error(f"Database query error: {str(e)}", exc_info=True)

    def get_activities(self):
        """
        Get all activities from the database.
        """
        self.logger.log_info("Fetching all activities from the database.")
        return self._execute_query('SELECT * FROM activities', fetch_all=True)

    def get_activities_by_day(self, day):
        """
        Get all activities for a specific day, ordered by start time.
        """
        self.logger.log_info(f"Fetching activities for day: {day}")
        return self._execute_query('SELECT * FROM activities WHERE day = ? ORDER BY start_time ASC', (day,), fetch_all=True)

    def get_activity_by_id(self, activity_id):
        """
        Get a specific activity by its ID.
        """
        self.logger.log_info(f"Fetching activity by ID: {activity_id}")
        return self._execute_query('SELECT * FROM activities WHERE id = ?', (activity_id,), fetch_one=True)

    def get_next_activity(self, day):
        """
        Get the next not started activity for a specific day.
        """
        current_time = datetime.now().strftime("%H:%M")
        self.logger.log_info(f"Fetching next activity for day: {day} after current time: {current_time}")
        return self._execute_query('''
            SELECT * FROM activities 
            WHERE day = ? AND status = 'not started' AND start_time > ?
            ORDER BY start_time ASC LIMIT 1
        ''', (day, current_time), fetch_one=True)

    def insert_activity(self, name, duration, description, start_time, end_time, day):
        """
        Insert a new activity into the database.
        """
        self.logger.log_info(f"Inserting new activity: {name}, Duration: {duration} min, Day: {day}")
        self._execute_query('''
            INSERT INTO activities (name, duration, description, start_time, end_time, day, status)
            VALUES (?, ?, ?, ?, ?, ?, 'not started')
        ''', (name, duration, description, start_time, end_time, day))

    def update_activity(self, activity_id, name, duration, description, start_time, end_time, day):
        """
        Update an existing activity in the database.
        """
        self.logger.log_info(f"Updating activity ID: {activity_id} with new details.")
        self._execute_query('''
            UPDATE activities
            SET name = ?, duration = ?, description = ?, start_time = ?, end_time = ?, day = ?
            WHERE id = ?
        ''', (name, duration, description, start_time, end_time, day, activity_id))

    def delete_activity(self, activity_id):
        """
        Delete an activity from the database by its ID.
        """
        self.logger.log_info(f"Deleting activity ID: {activity_id}")
        self._execute_query('DELETE FROM activities WHERE id = ?', (activity_id,))

    def update_activity_status(self, activity_id, status, start_timestamp=None, end_timestamp=None, time_spent=None):
        """
        Update the status of an activity, including optional timestamps and time spent.
        """
        self.logger.log_info(f"Updating status for activity ID: {activity_id} to '{status}'")
        self._execute_query('''
            UPDATE activities
            SET status = ?,
                start_timestamp = COALESCE(?, start_timestamp),
                end_timestamp = COALESCE(?, end_timestamp),
                time_spent = COALESCE(?, time_spent)
            WHERE id = ?
        ''', (status, start_timestamp, end_timestamp, time_spent, activity_id))

    def stop_all_activities(self, day):
        """
        Stop all ongoing activities for a specific day by resetting their status.
        """
        self.logger.log_info(f"Stopping all ongoing activities for day: {day}")
        self._execute_query('''
            UPDATE activities
            SET status = 'not started',
                start_timestamp = NULL,
                end_timestamp = NULL,
                time_spent = 0
            WHERE day = ? AND status = 'in progress'
        ''', (day,))

    def start_activity(self, activity_id):
        """
        Start an activity by updating its status to 'in progress' and stopping other activities for the same day.
        """
        self.logger.log_info(f"Starting activity ID: {activity_id}")
        activity = self.get_activity_by_id(activity_id)
        if activity:
            self.stop_all_activities(activity[7])
        start_timestamp = datetime.now().isoformat()
        self.update_activity_status(activity_id, 'in progress', start_timestamp=start_timestamp)

# Example usage
if __name__ == "__main__":
    db_helper = DatabaseHelper()
    db_helper.insert_activity("Sample Activity", 60, "Description", "09:00", "10:00", "Day 1")
    activities = db_helper.get_activities()
    for activity in activities:
        print(activity)