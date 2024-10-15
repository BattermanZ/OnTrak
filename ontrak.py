from flask import Flask, request, render_template, redirect, url_for, jsonify, make_response
from datetime import datetime, timedelta
from helpers.database_helper import DatabaseHelper
from helpers.logging_helper import LoggingHelper
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Initialize helpers
db_helper = DatabaseHelper()
logger = LoggingHelper()

def validate_day_parameter(day_param, endpoint):
    if not day_param:
        logger.log_warning(f"Day parameter is missing in the {endpoint} request.")
        return jsonify({"error": "Day parameter is missing."}), 400
    return None

def group_activities_by_day(activities):
    return {f'Day {i}': sorted([a for a in activities if a[6] == f'Day {i}'], key=lambda x: x[4]) for i in range(1, 5)}

@app.route('/')
def dashboard():
    """
    Render the dashboard page with activities grouped by day.
    """
    selected_day = request.args.get('day', 'Day 1')
    logger.log_request('GET', '/', {'day': selected_day})
    validation_error = validate_day_parameter(selected_day, 'dashboard')
    if validation_error:
        return validation_error

    activities = db_helper.get_activities()
    grouped_activities = group_activities_by_day(activities)
    today_activities = grouped_activities.get(selected_day, [])
    now = datetime.now().strftime('%H:%M')
    upcoming_activity = next((a for a in today_activities if a[4] > now), None)
    current_activity = next((a for a in today_activities if a[4] <= now <= a[5]), None)

    logger.log_info(f"Dashboard page accessed for {selected_day}.")
    return render_template('dash.html', grouped_activities=grouped_activities, upcoming_activity=upcoming_activity, current_activity=current_activity, selected_day=selected_day)

@app.route('/get_current_activity', methods=['GET'])
def get_current_activity():
    """
    Get the current ongoing activity for the selected day.
    """
    selected_day = request.args.get('day', 'Day 1')
    logger.log_request('GET', '/get_current_activity', {'day': selected_day})
    validation_error = validate_day_parameter(selected_day, 'get current activity')
    if validation_error:
        return validation_error

    activities = db_helper.get_activities_by_day(selected_day)
    now = datetime.now().strftime('%H:%M')
    current_activity = next(({
        "id": activity[0],
        "name": activity[1],
        "start_time": activity[4],
        "end_time": activity[5]
    } for activity in activities if activity[4] <= now <= activity[5]), None)

    logger.log_info(f"Current activity retrieved for {selected_day}: {current_activity}")
    return jsonify({"current_activity": current_activity})

@app.route('/start_activity', methods=['POST'])
def start_activity():
    """
    Start the next activity that has not yet ended for the selected day.
    """
    selected_day = request.json.get('day')
    logger.log_request('POST', '/start_activity', {'day': selected_day})
    validation_error = validate_day_parameter(selected_day, 'start activity')
    if validation_error:
        return validation_error

    activities = db_helper.get_activities_by_day(selected_day)
    now = datetime.now().strftime('%H:%M')
    next_activity = next((a for a in activities if a[5] > now), None)
    if not next_activity:
        logger.log_warning(f"No activities available to start for {selected_day}.")
        return jsonify({"error": "No activities available to start."}), 400

    activity_id = next_activity[0]
    start_time, end_time = next_activity[4], next_activity[5]
    logger.log_info(f"Activity ID {activity_id} started at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}.")

    response = make_response(jsonify({"activity_id": activity_id, "name": next_activity[1], "start_time": start_time, "end_time": end_time, "duration": next_activity[2]}))
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response

@app.route('/skip_activity', methods=['POST'])
def skip_activity():
    """
    Skip to the next activity, regardless of the start time.
    """
    selected_day = request.json.get('day')
    logger.log_request('POST', '/skip_activity', {'day': selected_day})
    validation_error = validate_day_parameter(selected_day, 'skip activity')
    if validation_error:
        return validation_error

    activities = db_helper.get_activities_by_day(selected_day)
    now = datetime.now().strftime('%H:%M')
    current_index = next((i for i, a in enumerate(activities) if a[4] <= now <= a[5]), -1)
    next_index = (current_index + 1) if current_index != -1 else 0

    if next_index < len(activities):
        next_activity = activities[next_index]
        activity_id = next_activity[0]
        start_time, end_time = next_activity[4], next_activity[5]
        logger.log_info(f"Activity ID {activity_id} skipped to at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}.")

        response = make_response(jsonify({"activity_id": activity_id, "name": next_activity[1], "start_time": start_time, "end_time": end_time, "duration": next_activity[2]}))
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response
    else:
        logger.log_warning(f"No upcoming activities available to skip for {selected_day}.")
        return jsonify({"error": "No upcoming activities available to skip."}), 400

@app.route('/stop_activity', methods=['POST'])
def stop_activity():
    """
    Stop the current ongoing activity.
    """
    activity_id = request.json.get('activity_id')
    logger.log_request('POST', '/stop_activity', {'activity_id': activity_id})
    if not activity_id:
        return jsonify({"error": "Activity ID is missing."}), 400

    logger.log_info(f"Activity ID {activity_id} has been stopped.")

    response = make_response(jsonify({"status": "success"}))
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response

@app.route('/setup', methods=['GET', 'POST'])
def setup():
    """
    Setup new activities or view the setup page to manage activities.
    """
    if request.method == 'POST':
        activity_name = request.form.get('activity', 'Unnamed Activity')
        duration = int(request.form.get('duration', '0'))
        description = request.form.get('description', 'No description provided')
        start_time = request.form.get('start_time', '00:00')
        day = request.form.get('day', 'Day 1')
        logger.log_request('POST', '/setup', {'activity': activity_name, 'duration': duration, 'day': day})
        validation_error = validate_day_parameter(day, 'setup')
        if validation_error:
            return validation_error

        start_time_obj = datetime.strptime(start_time, '%H:%M')
        end_time_obj = start_time_obj + timedelta(minutes=duration)
        end_time = end_time_obj.strftime('%H:%M')
        db_helper.insert_activity(activity_name, duration, description, start_time, end_time, day)
        logger.log_info(f"Activity '{activity_name}' added to the database.")

    activities = db_helper.get_activities()
    grouped_activities = group_activities_by_day(activities)
    logger.log_info("Setup page accessed.")
    return render_template('setup.html', grouped_activities=grouped_activities)

@app.route('/edit', methods=['POST'])
def edit():
    """
    Edit an existing activity.
    """
    activity_id = int(request.form['activity_id'])
    logger.log_request('POST', '/edit', {'activity_id': activity_id})
    activity = db_helper.get_activity_by_id(activity_id)
    activities = db_helper.get_activities()
    grouped_activities = group_activities_by_day(activities)
    logger.log_info(f"Edit page accessed for activity ID {activity_id}.")
    return render_template('setup.html', edit_activity=activity, edit_index=activity_id, grouped_activities=grouped_activities)

@app.route('/update', methods=['POST'])
def update():
    """
    Update an existing activity with new information.
    """
    activity_id = int(request.form['activity_id'])
    activity_name = request.form.get('activity', 'Unnamed Activity')
    duration = int(request.form.get('duration', '0'))
    description = request.form.get('description', 'No description provided')
    start_time = request.form.get('start_time', '00:00')
    day = request.form.get('day', 'Day 1')
    logger.log_request('POST', '/update', {'activity_id': activity_id, 'activity': activity_name, 'day': day})
    validation_error = validate_day_parameter(day, 'update')
    if validation_error:
        return validation_error

    start_time_obj = datetime.strptime(start_time, '%H:%M')
    end_time_obj = start_time_obj + timedelta(minutes=duration)
    end_time = end_time_obj.strftime('%H:%M')
    db_helper.update_activity(activity_id, activity_name, duration, description, start_time, end_time, day)
    logger.log_info(f"Activity ID {activity_id} updated to '{activity_name}'.")
    return redirect(url_for('setup'))

@app.route('/delete', methods=['POST'])
def delete():
    """
    Delete an activity from the database.
    """
    activity_id = int(request.form['activity_id'])
    logger.log_request('POST', '/delete', {'activity_id': activity_id})
    db_helper.delete_activity(activity_id)
    logger.log_info(f"Activity ID {activity_id} deleted from the database.")
    return redirect(url_for('setup'))

@app.route('/log', methods=['POST'])
def log_from_frontend():
    """
    Capture log messages from the frontend (JavaScript).
    """
    data = request.json
    level = data.get('level')
    message = data.get('message')
    if level and message:
        logger.log_from_frontend(level, message)
        return jsonify({'status': 'success'}), 200
    else:
        logger.log_warning("Invalid log request from frontend: missing 'level' or 'message'.")
        return jsonify({'error': 'Invalid log request'}), 400

if __name__ == "__main__":
    app.run(debug=True)
