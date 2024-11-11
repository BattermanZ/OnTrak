from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import os
import random

# Get the absolute path of the current file
basedir = os.path.abspath(os.path.dirname(__file__))

# Create the 'instance' directory if it doesn't exist
instance_path = os.path.join(basedir, 'instance')
if not os.path.exists(instance_path):
    os.makedirs(instance_path)

app = Flask(__name__, static_folder='react-app/build', static_url_path='')

# Use absolute path for the database file
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'instance', 'ontrak.db')
db = SQLAlchemy(app)

class Template(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(500))
    duration = db.Column(db.Integer, nullable=False)
    sessions = db.relationship('Session', backref='template', lazy=True)
    activities = db.relationship('Activity', backref='template', lazy=True)

class Activity(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    template_id = db.Column(db.Integer, db.ForeignKey('template.id'), nullable=False)
    day = db.Column(db.Integer, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(500))
    start_time = db.Column(db.Time, nullable=False)
    duration = db.Column(db.Integer, nullable=False)  # duration in minutes

class Session(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    template_id = db.Column(db.Integer, db.ForeignKey('template.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    current_day = db.Column(db.Integer, default=1)
    start_date = db.Column(db.Date, default=datetime.utcnow)

@app.route('/')
def dashboard():
    active_sessions = Session.query.all()
    templates = Template.query.all()
    return render_template('dashboard.html', sessions=active_sessions, templates=templates)

@app.route('/setup')
def setup():
    return send_from_directory('react-app/build', 'index.html')

@app.route('/api/setup', methods=['POST'])
def api_setup():
    data = request.json
    new_template = Template(
        name=data['name'],
        description=data['description'],
        duration=int(data['duration'])
    )
    db.session.add(new_template)
    db.session.commit()

    for activity in data['activities']:
        new_activity = Activity(
            template_id=new_template.id,
            day=int(activity['day']),
            name=activity['name'],
            description=activity['description'],
            start_time=datetime.strptime(activity['startTime'], '%H:%M').time(),
            duration=int(activity['duration'])
        )
        db.session.add(new_activity)
    db.session.commit()
    return jsonify({"success": True, "message": "Template created successfully"})

@app.route('/start_session', methods=['POST'])
def start_session():
    template_id = request.form['template_id']
    session_name = request.form['session_name']
    new_session = Session(template_id=template_id, name=session_name)
    db.session.add(new_session)
    db.session.commit()
    return jsonify({"success": True, "session_id": new_session.id})

@app.route('/end_day/<int:session_id>', methods=['POST'])
def end_day(session_id):
    session = Session.query.get_or_404(session_id)
    session.current_day += 1
    if session.current_day > session.template.duration:
        db.session.delete(session)
    db.session.commit()
    return jsonify({"success": True})

@app.route('/statistics')
def statistics():
    return render_template('statistics.html')

@app.route('/api/statistics')
def get_statistics():
    activities = ['Introduction', 'Theory', 'Practice', 'Break', 'Q&A', 'Wrap-up']
    
    time_data = {
        'labels': activities,
        'values': [random.randint(-15, 15) for _ in activities]
    }
    
    completion_data = [70, 20, 10]  # Completed on time, late, not completed
    
    trend_data = {
        'labels': ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        'datasets': [
            {
                'label': activity,
                'data': [random.randint(30, 90) for _ in range(4)],
                'borderColor': f'rgba({random.randint(0,255)}, {random.randint(0,255)}, {random.randint(0,255)}, 1)',
                'fill': False
            } for activity in activities
        ]
    }
    
    detailed_stats = [
        {
            'name': activity,
            'scheduledDuration': random.randint(30, 90),
            'actualDuration': random.randint(30, 90),
            'completionRate': random.random(),
            'trend': random.choice(['Improving', 'Stable', 'Declining'])
        } for activity in activities
    ]
    
    return jsonify({
        'timeData': time_data,
        'completionData': completion_data,
        'trendData': trend_data,
        'detailedStats': detailed_stats
    })

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('react-app/build/static', path)

@app.route('/<path:path>')
def catch_all(path):
    if path.startswith('static/'):
        return send_from_directory('react-app/build', path)
    return send_from_directory('react-app/build', 'index.html')

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=9999, debug=True)