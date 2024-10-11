from flask import Flask, request, render_template, redirect, url_for
from datetime import datetime, timedelta
import sqlite3
import os
import logging

app = Flask(__name__)

# Configure logging
if not os.path.exists('logs'):
    os.makedirs('logs')
logging.basicConfig(filename='logs/logs.txt', level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Database setup
if not os.path.exists('database'):
    os.makedirs('database')

def init_db():
    with sqlite3.connect('database/activities.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                duration INTEGER NOT NULL,
                description TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                day TEXT NOT NULL
            )
        ''')
        conn.commit()

init_db()

@app.route('/')
def dashboard():
    # Retrieve selected day from request arguments, default to 'Day 1'
    selected_day = request.args.get('day', 'Day 1')

    # Retrieve activities from the database
    with sqlite3.connect('database/activities.db') as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM activities')
        activities = cursor.fetchall()

    # Group activities by day and sort by start time
    grouped_activities = {
        'Day 1': sorted([a for a in activities if a[6] == 'Day 1'], key=lambda x: x[4]),
        'Day 2': sorted([a for a in activities if a[6] == 'Day 2'], key=lambda x: x[4]),
        'Day 3': sorted([a for a in activities if a[6] == 'Day 3'], key=lambda x: x[4]),
        'Day 4': sorted([a for a in activities if a[6] == 'Day 4'], key=lambda x: x[4])
    }

    # Get activities for the selected day
    today_activities = grouped_activities.get(selected_day, [])
    completed_activities = len(today_activities)
    total_duration = sum(activity[2] for activity in today_activities)

    # Get next upcoming activity
    upcoming_activity = None
    now = datetime.now().strftime('%H:%M')
    for activity in today_activities:
        if activity[4] > now:
            upcoming_activity = activity
            break

    logging.info(f"Dashboard page accessed for {selected_day}.")
    return render_template('dash.html', grouped_activities=grouped_activities, completed_activities=completed_activities, total_duration=total_duration, upcoming_activity=upcoming_activity, selected_day=selected_day)

@app.route('/setup', methods=['GET', 'POST'])
def setup():
    if request.method == 'POST':
        # Get form data with default values
        activity_name = request.form.get('activity', 'Unnamed Activity')
        duration = int(request.form.get('duration', '0'))
        description = request.form.get('description', 'No description provided')
        start_time = request.form.get('start_time', '00:00')
        day = request.form.get('day', 'Day 1')
        
        # Calculate end time based on start time and duration
        start_time_obj = datetime.strptime(start_time, '%H:%M')
        end_time_obj = start_time_obj + timedelta(minutes=duration)
        end_time = end_time_obj.strftime('%H:%M')
        
        # Insert the activity into the database
        with sqlite3.connect('database/activities.db') as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO activities (name, duration, description, start_time, end_time, day)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (activity_name, duration, description, start_time, end_time, day))
            conn.commit()
            logging.info(f"Activity '{activity_name}' added to the database.")

    # Retrieve activities from the database
    with sqlite3.connect('database/activities.db') as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM activities')
        activities = cursor.fetchall()

    # Group activities by day and sort by start time
    grouped_activities = {
        'Day 1': sorted([a for a in activities if a[6] == 'Day 1'], key=lambda x: x[4]),
        'Day 2': sorted([a for a in activities if a[6] == 'Day 2'], key=lambda x: x[4]),
        'Day 3': sorted([a for a in activities if a[6] == 'Day 3'], key=lambda x: x[4]),
        'Day 4': sorted([a for a in activities if a[6] == 'Day 4'], key=lambda x: x[4])
    }

    logging.info("Setup page accessed.")
    return render_template('setup.html', grouped_activities=grouped_activities)

@app.route('/edit', methods=['POST'])
def edit():
    activity_id = int(request.form['activity_id'])
    
    # Retrieve the activity to be edited from the database
    with sqlite3.connect('database/activities.db') as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM activities WHERE id = ?', (activity_id,))
        activity = cursor.fetchone()
    
    # Retrieve all activities for grouping
    with sqlite3.connect('database/activities.db') as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM activities')
        activities = cursor.fetchall()
    
    # Group activities by day and sort by start time
    grouped_activities = {
        'Day 1': sorted([a for a in activities if a[6] == 'Day 1'], key=lambda x: x[4]),
        'Day 2': sorted([a for a in activities if a[6] == 'Day 2'], key=lambda x: x[4]),
        'Day 3': sorted([a for a in activities if a[6] == 'Day 3'], key=lambda x: x[4]),
        'Day 4': sorted([a for a in activities if a[6] == 'Day 4'], key=lambda x: x[4])
    }

    logging.info(f"Edit page accessed for activity ID {activity_id}.")
    return render_template('setup.html', edit_activity=activity, edit_index=activity_id, grouped_activities=grouped_activities)

@app.route('/update', methods=['POST'])
def update():
    activity_id = int(request.form['activity_id'])
    activity_name = request.form.get('activity', 'Unnamed Activity')
    duration = int(request.form.get('duration', '0'))
    description = request.form.get('description', 'No description provided')
    start_time = request.form.get('start_time', '00:00')
    day = request.form.get('day', 'Day 1')
    
    # Calculate end time based on start time and duration
    start_time_obj = datetime.strptime(start_time, '%H:%M')
    end_time_obj = start_time_obj + timedelta(minutes=duration)
    end_time = end_time_obj.strftime('%H:%M')
    
    # Update the activity in the database
    with sqlite3.connect('database/activities.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE activities
            SET name = ?, duration = ?, description = ?, start_time = ?, end_time = ?, day = ?
            WHERE id = ?
        ''', (activity_name, duration, description, start_time, end_time, day, activity_id))
        conn.commit()
        logging.info(f"Activity ID {activity_id} updated to '{activity_name}'.")
    
    return redirect(url_for('setup'))

@app.route('/delete', methods=['POST'])
def delete():
    activity_id = int(request.form['activity_id'])
    
    # Delete the activity from the database
    with sqlite3.connect('database/activities.db') as conn:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM activities WHERE id = ?', (activity_id,))
        conn.commit()
        logging.info(f"Activity ID {activity_id} deleted from the database.")
    
    return redirect(url_for('setup'))

if __name__ == "__main__":
    app.run(debug=True)