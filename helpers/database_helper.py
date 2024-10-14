import sqlite3
import os
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
                        day TEXT NOT NULL
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

    def insert_activity(self, name, duration, description, start_time, end_time, day):
        """
        Insert a new activity into the database.
        """
        self.logger.log_info(f"Inserting new activity: {name}, Duration: {duration} min, Day: {day}")
        self._execute_query('''
            INSERT INTO activities (name, duration, description, start_time, end_time, day)
            VALUES (?, ?, ?, ?, ?, ?)
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

                

# Example usage
if __name__ == "__main__":
    db_helper = DatabaseHelper()
    db_helper.insert_activity("Sample Activity", 60, "Description", "09:00", "10:00", "Day 1")
    activities = db_helper.get_activities()
    for activity in activities:
        print(activity)