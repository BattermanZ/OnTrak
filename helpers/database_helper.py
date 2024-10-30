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
                self.logger.log_info("Database configured successfully.")
        except sqlite3.OperationalError as oe:
            # Handle the case where the column already exists
            self.logger.log_error("Operational error configuring the database.", exc_info=True)
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
                self.logger.log_debug(f"Query executed successfully")
                if fetch_one:
                    return cursor.fetchone()
                if fetch_all:
                    return cursor.fetchall() or []
        except sqlite3.Error as e:
            self.logger.log_error(f"Database query error: {str(e)}", exc_info=True)
            raise

    def get_activities(self):
        """ Get all activities from the database. """
        return self._execute_query('SELECT * FROM activities', fetch_all=True)

    def get_activities_by_day(self, day):
        """ Get all activities for a specific day, ordered by start time. """
        return self._execute_query('SELECT * FROM activities WHERE day = ? ORDER BY start_time ASC', (day,), fetch_all=True)

    def get_activity_by_id(self, activity_id):
        """ Get a specific activity by its ID. """
        self.logger.log_debug(f"Fetching activity by ID: {activity_id}")
        return self._execute_query('SELECT * FROM activities WHERE id = ?', (activity_id,), fetch_one=True)

    def insert_activity(self, name, duration, description, start_time, end_time, day):
        """
        Insert a new activity into the database.
        """
        self.logger.log_debug(f"Inserting activity: Name={name}, Duration={duration}, Day={day}, Start Time={start_time}, End Time={end_time}")
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.isolation_level = 'IMMEDIATE'  # Use IMMEDIATE lock to reduce concurrency issues
                cursor = conn.cursor()

                # Insert the activity
                cursor.execute('''
                    INSERT INTO activities (name, duration, description, start_time, end_time, day)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (name, duration, description, start_time, end_time, day))

                # Commit the transaction
                conn.commit()
                self.logger.log_info(f"Activity '{name}' has been inserted successfully.")
                self.logger.log_debug(f"Inserted activity details: Name={name}, Duration={duration}, Day={day}, Start Time={start_time}, End Time={end_time}")
        except sqlite3.Error as e:
            # Rollback if there is any error
            conn.rollback()
            self.logger.log_error(f"Error inserting activity: {str(e)}", exc_info=True)
            raise

    def update_activity(self, activity_id, name, duration, description, start_time, end_time, day):
        """ Update an existing activity in the database. """
        self.logger.log_debug(f"Updating activity ID {activity_id}")
        self._execute_query('''
            UPDATE activities
            SET name = ?, duration = ?, description = ?, start_time = ?, end_time = ?, day = ?
            WHERE id = ?
        ''', (name, duration, description, start_time, end_time, day, activity_id))

    def delete_activity(self, activity_id):
        """ Delete an activity from the database by its ID. """
        self.logger.log_debug(f"Deleting activity ID {activity_id}")
        self._execute_query('DELETE FROM activities WHERE id = ?', (activity_id,))

    def get_next_activity(self, day, current_time):
        """ Get the next activity for a specific day based on the current time. """
        self.logger.log_debug(f"Fetching next activity for day {day} after {current_time}")
        return self._execute_query(
            'SELECT * FROM activities WHERE day = ? AND start_time >= ? ORDER BY start_time ASC LIMIT 1',
            (day, current_time),
            fetch_one=True
        )

# Example usage
if __name__ == "__main__":
    db_helper = DatabaseHelper()
    # Insert a sample activity (shared among all users)
    db_helper.insert_activity("Sample Activity", 60, "Description", "09:00", "10:00", "Day 1")
    activities = db_helper.get_activities()
    for activity in activities:
        print(activity)
