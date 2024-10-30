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
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_HTTPONLY'] = True
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Initialize helpers
db_helper = DatabaseHelper()
logger = LoggingHelper()

def get_user_id():
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
    session.modified = True
    return session['user_id']

def validate_day_parameter(day_param, endpoint):
    if not day_param:
        logger.log_warning(f"Day parameter is missing in the {endpoint} request.")
        return jsonify({"error": "Day parameter is missing."}), 400
    return None

def group_activities_by_day(activities):
    if not activities:
        return {f'Day {i}': [] for i in range(1, 5)}
    grouped = {f'Day {i}': [] for i in range(1, 5)}
    for activity in activities:
        if activity[6] in grouped:
            grouped[activity[6]].append(activity)
    return {day: sorted(acts, key=lambda x: x[4]) for day, acts in grouped.items()}

def get_activity_data(activity):
    if not activity:
        return None
    return {
        "id": activity[0],
        "name": activity[1],
        "start_time": activity[4],
        "end_time": activity[5],
        "duration": activity[2],
        "description": activity[3],
        "day": activity[6]
    }

def find_current_and_upcoming_activities(activities, current_time):
    current_activity = None
    upcoming_activity = None
    
    sorted_activities = sorted(activities, key=lambda x: x[4])  # Sort by start time
    
    for activity in sorted_activities:
        start_time = activity[4]
        end_time = activity[5]
        
        if start_time <= current_time <= end_time:
            current_activity = activity
        elif start_time > current_time:
            if not upcoming_activity or start_time < upcoming_activity[4]:
                upcoming_activity = activity
                
    return current_activity, upcoming_activity

@app.route('/')
def dashboard():
    user_id = get_user_id()
    selected_day = request.args.get('day', 'Day 1')
    logger.log_request('GET', '/', {'day': selected_day, 'user_id': user_id})
    
    activities = db_helper.get_activities() or []
    grouped_activities = group_activities_by_day(activities)
    
    logger.log_info(f"Dashboard accessed for {selected_day} by user {user_id}")
    return render_template('dash.html', 
                         grouped_activities=grouped_activities,
                         selected_day=selected_day,
                         user_id=user_id)

@app.route('/get_current_activity', methods=['GET'])
def get_current_activity():
    user_id = get_user_id()
    selected_day = request.args.get('day', 'Day 1')
    current_time = datetime.now().strftime('%H:%M')
    
    activities = db_helper.get_activities_by_day(selected_day) or []
    current_activity, upcoming_activity = find_current_and_upcoming_activities(activities, current_time)
    
    logger.log_info(f"Current activity check for {selected_day} by user {user_id}")
    logger.log_debug(f"Current time: {current_time}")
    logger.log_debug(f"Current activity: {current_activity}")
    logger.log_debug(f"Upcoming activity: {upcoming_activity}")
    
    return jsonify({
        "current_activity": get_activity_data(current_activity),
        "upcoming_activity": get_activity_data(upcoming_activity)
    })

@app.route('/start_activity', methods=['POST'])
def start_activity():
    user_id = get_user_id()
    if not request.is_json:
        return jsonify({"error": "Invalid content type"}), 400
    
    data = request.get_json()
    selected_day = data.get('day')
    current_time = datetime.now().strftime('%H:%M')
    
    activities = db_helper.get_activities_by_day(selected_day) or []
    current_activity, upcoming_activity = find_current_and_upcoming_activities(activities, current_time)
    
    if current_activity:
        activity_data = get_activity_data(current_activity)
    elif upcoming_activity:
        activity_data = get_activity_data(upcoming_activity)
    else:
        return jsonify({"error": "No activity available to start"}), 400
    
    logger.log_info(f"Activity {activity_data['id']} started by user {user_id}")
    socketio.emit('activity_started', activity_data)
    
    return jsonify(activity_data)

@app.route('/stop_activity', methods=['POST'])
def stop_activity():
    user_id = get_user_id()
    if not request.is_json:
        return jsonify({"error": "Invalid content type"}), 400
    
    data = request.get_json()
    activity_id = data.get('activity_id')
    
    if not activity_id:
        return jsonify({"error": "Activity ID is required"}), 400
    
    logger.log_info(f"Activity {activity_id} stopped by user {user_id}")
    socketio.emit('activity_stopped', {"activity_id": activity_id})
    
    return jsonify({"status": "success"})

@app.route('/skip_activity', methods=['POST'])
def skip_activity():
    user_id = get_user_id()
    if not request.is_json:
        return jsonify({"error": "Invalid content type"}), 400
    
    data = request.get_json()
    selected_day = data.get('day')
    current_time = datetime.now().strftime('%H:%M')
    
    activities = db_helper.get_activities_by_day(selected_day) or []
    _, upcoming_activity = find_current_and_upcoming_activities(activities, current_time)
    
    if not upcoming_activity:
        return jsonify({"error": "No next activity available"}), 400
    
    activity_data = get_activity_data(upcoming_activity)
    logger.log_info(f"Skipped to activity {activity_data['id']} by user {user_id}")
    socketio.emit('activity_started', activity_data)
    
    return jsonify(activity_data)

@app.route('/setup', methods=['GET', 'POST'])
def setup():
    if request.method == 'POST':
        activity_id = request.form.get('activity_id')
        activity_data = {
            "name": request.form.get('name', 'Unnamed Activity'),
            "duration": int(request.form.get('duration', '0')),
            "description": request.form.get('description', ''),
            "start_time": request.form.get('start_time', '00:00'),
            "day": request.form.get('day', 'Day 1')
        }
        
        start_time_obj = datetime.strptime(activity_data['start_time'], '%H:%M')
        end_time_obj = start_time_obj + timedelta(minutes=activity_data['duration'])
        activity_data['end_time'] = end_time_obj.strftime('%H:%M')
        
        if activity_id:
            db_helper.update_activity(activity_id, **activity_data)
        else:
            db_helper.insert_activity(**activity_data)
            
        return redirect(url_for('setup', day=activity_data['day']))
    
    activities = db_helper.get_activities() or []
    grouped_activities = group_activities_by_day(activities)
    return render_template('setup.html', 
                         grouped_activities=grouped_activities,
                         selected_day=request.args.get('day', 'Day 1'))

if __name__ == "__main__":
    socketio.run(app, host='0.0.0.0', port=9999, debug=True)