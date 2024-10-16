from flask import Flask, request, render_template, redirect, url_for, jsonify, make_response, session
from datetime import datetime, timedelta
from helpers.database_helper import DatabaseHelper
from helpers.logging_helper import LoggingHelper
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import uuid

# Initialize Flask app, CORS, and SocketIO
app = Flask(__name__)
app.secret_key = 'supersecretkey'
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Initialize helpers
db_helper = DatabaseHelper()
logger = LoggingHelper()

# Helper function to get or generate user_id
def get_user_id():
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
    return session['user_id']

# Helper function to validate day parameter
def validate_day_parameter(day_param, endpoint):
    if not day_param:
        logger.log_warning(f"Day parameter is missing in the {endpoint} request.")
        return jsonify({"error": "Day parameter is missing."}), 400
    return None

# Helper function to group activities by day
def group_activities_by_day(activities):
    if not activities:
        return {f'Day {i}': [] for i in range(1, 5)}
    return {f'Day {i}': sorted([a for a in activities if a[6] == f'Day {i}'], key=lambda x: x[4]) for i in range(1, 5)}

@app.route('/')
def dashboard():
    user_id = get_user_id()
    selected_day = request.args.get('day', 'Day 1')
    logger.log_request('GET', '/', {'day': selected_day, 'user_id': user_id})
    validation_error = validate_day_parameter(selected_day, 'dashboard')
    if validation_error:
        return validation_error

    activities = db_helper.get_activities() or []
    logger.log_debug(f"Activities retrieved: {activities}")
    grouped_activities = group_activities_by_day(activities)
    logger.log_debug(f"Grouped activities: {grouped_activities}")
    now = datetime.now().strftime('%H:%M')
    upcoming_activity = db_helper.get_next_activity(selected_day, now)
    user_statuses = db_helper.get_activity_statuses(user_id)
    current_activity = next((a for a in grouped_activities.get(selected_day, []) if a[4] <= now <= a[5]), None)

    logger.log_info(f"Dashboard page accessed for {selected_day} by user {user_id}.")
    return render_template('dash.html', grouped_activities=grouped_activities, upcoming_activity=upcoming_activity, current_activity=current_activity, selected_day=selected_day, user_statuses=user_statuses)

@app.route('/get_current_activity', methods=['GET'])
def get_current_activity():
    user_id = get_user_id()
    selected_day = request.args.get('day', 'Day 1')
    logger.log_request('GET', '/get_current_activity', {'day': selected_day, 'user_id': user_id})
    validation_error = validate_day_parameter(selected_day, 'get current activity')
    if validation_error:
        return validation_error

    activities = db_helper.get_activities_by_day(selected_day) or []
    logger.log_debug(f"Activities retrieved for day {selected_day}: {activities}")
    now = datetime.now().strftime('%H:%M')
    current_activity = next(({
        "id": activity[0],
        "name": activity[1],
        "start_time": activity[4],
        "end_time": activity[5]
    } for activity in activities if activity[4] <= now <= activity[5]), None)

    logger.log_info(f"Current activity retrieved for {selected_day} by user {user_id}: {current_activity}")
    return jsonify({"current_activity": current_activity})

@app.route('/start_activity', methods=['POST'])
def start_activity():
    user_id = get_user_id()
    selected_day = request.json.get('day')
    logger.log_request('POST', '/start_activity', {'day': selected_day, 'user_id': user_id})
    validation_error = validate_day_parameter(selected_day, 'start activity')
    if validation_error:
        return validation_error

    now = datetime.now().strftime('%H:%M')
    current_activity = request.json.get('activity_id')
    if current_activity:
        activity = db_helper.get_activity_by_id(current_activity)
        if activity:
            activity_data = {
                "activity_id": activity[0],
                "name": activity[1],
                "start_time": now,
                "end_time": activity[5],
                "duration": activity[2]
            }
            db_helper.update_activity_status(user_id, activity_data['activity_id'], 'in-progress')
            logger.log_info(f"Activity ID {activity_data['activity_id']} restarted by user {user_id} at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}.")
            socketio.emit('activity_started', activity_data)
            return make_response(jsonify(activity_data), 200)

    next_activity = db_helper.get_next_activity(selected_day, now)
    if not next_activity:
        logger.log_warning(f"No activities available to start for {selected_day} by user {user_id}.")
        return jsonify({"error": "No activities available to start."}), 400

    activity_data = {
        "activity_id": next_activity[0],
        "name": next_activity[1],
        "start_time": now,
        "end_time": next_activity[5],
        "duration": next_activity[2]
    }
    db_helper.update_activity_status(user_id, activity_data['activity_id'], 'in-progress')
    logger.log_info(f"Activity ID {activity_data['activity_id']} started by user {user_id} at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}.")
    socketio.emit('activity_started', activity_data)

    return make_response(jsonify(activity_data), 200)

@app.route('/stop_activity', methods=['POST'])
def stop_activity():
    user_id = get_user_id()
    activity_id = request.json.get('activity_id')
    logger.log_request('POST', '/stop_activity', {'activity_id': activity_id, 'user_id': user_id})
    if not activity_id:
        return jsonify({"error": "Activity ID is missing."}), 400

    db_helper.update_activity_status(user_id, activity_id, 'stopped')
    logger.log_info(f"Activity ID {activity_id} has been stopped by user {user_id}.")
    socketio.emit('activity_stopped', {"activity_id": activity_id})

    return make_response(jsonify({"status": "success"}), 200)

@app.route('/setup', methods=['GET', 'POST'])
def setup():
    if request.method == 'POST':
        activity_data = {
            "name": request.form.get('activity', 'Unnamed Activity'),
            "duration": int(request.form.get('duration', '0')),
            "description": request.form.get('description', 'No description provided'),
            "start_time": request.form.get('start_time', '00:00'),
            "day": request.form.get('day', 'Day 1')
        }
        logger.log_request('POST', '/setup', {'activity': activity_data['name'], 'duration': activity_data['duration'], 'day': activity_data['day']})
        validation_error = validate_day_parameter(activity_data['day'], 'setup')
        if validation_error:
            return validation_error

        start_time_obj = datetime.strptime(activity_data['start_time'], '%H:%M')
        end_time_obj = start_time_obj + timedelta(minutes=activity_data['duration'])
        activity_data['end_time'] = end_time_obj.strftime('%H:%M')
        db_helper.insert_activity(**activity_data)
        logger.log_info(f"Activity '{activity_data['name']}' added to the database.")

    activities = db_helper.get_activities() or []
    logger.log_debug(f"Activities retrieved for setup page: {activities}")
    grouped_activities = group_activities_by_day(activities)
    logger.log_debug(f"Grouped activities for setup page: {grouped_activities}")
    logger.log_info(f"Setup page accessed.")
    return render_template('setup.html', grouped_activities=grouped_activities)

@app.route('/edit', methods=['POST'])
def edit():
    activity_id = int(request.form['activity_id'])
    logger.log_request('POST', '/edit', {'activity_id': activity_id})
    activity = db_helper.get_activity_by_id(activity_id)
    logger.log_debug(f"Activity retrieved for edit: {activity}")
    grouped_activities = group_activities_by_day(db_helper.get_activities() or [])
    logger.log_info(f"Edit page accessed for activity ID {activity_id}.")
    return render_template('setup.html', edit_activity=activity, edit_index=activity_id, grouped_activities=grouped_activities)

@app.route('/update', methods=['POST'])
def update():
    activity_data = {
        "activity_id": int(request.form['activity_id']),
        "name": request.form.get('activity', 'Unnamed Activity'),
        "duration": int(request.form.get('duration', '0')),
        "description": request.form.get('description', 'No description provided'),
        "start_time": request.form.get('start_time', '00:00'),
        "day": request.form.get('day', 'Day 1')
    }
    logger.log_request('POST', '/update', {'activity_id': activity_data['activity_id'], 'activity': activity_data['name'], 'day': activity_data['day']})
    validation_error = validate_day_parameter(activity_data['day'], 'update')
    if validation_error:
        return validation_error

    start_time_obj = datetime.strptime(activity_data['start_time'], '%H:%M')
    end_time_obj = start_time_obj + timedelta(minutes=activity_data['duration'])
    activity_data['end_time'] = end_time_obj.strftime('%H:%M')
    db_helper.update_activity(**activity_data)
    logger.log_info(f"Activity ID {activity_data['activity_id']} updated to '{activity_data['name']}'.")
    return redirect(url_for('setup'))

@app.route('/delete', methods=['POST'])
def delete():
    activity_id = int(request.form['activity_id'])
    logger.log_request('POST', '/delete', {'activity_id': activity_id})
    db_helper.delete_activity(activity_id)
    logger.log_info(f"Activity ID {activity_id} deleted from the database.")
    return redirect(url_for('setup'))

@app.route('/log', methods=['POST'])
def log_from_frontend():
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
    socketio.run(app, debug=True)