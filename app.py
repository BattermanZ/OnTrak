from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import sessionmaker
from datetime import datetime, time, timedelta
import logging
import subprocess
import json

app = Flask(__name__, static_folder='static', static_url_path='/static')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///ontrak.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

logging.basicConfig(level=logging.DEBUG)

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
    start_time = db.Column(db.String, nullable=False)
    duration = db.Column(db.Integer, nullable=False)
    completed = db.Column(db.Boolean, default=False)
    actual_start_time = db.Column(db.String)
    actual_end_time = db.Column(db.String)
    actual_duration = db.Column(db.Integer)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "start_time": self.start_time,
            "duration": self.duration,
            "completed": self.completed,
            "day": self.day,
            "actual_start_time": self.actual_start_time,
            "actual_end_time": self.actual_end_time,
            "actual_duration": self.actual_duration
        }

class Session(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    template_id = db.Column(db.Integer, db.ForeignKey('template.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    current_day = db.Column(db.Integer, default=1)
    start_date = db.Column(db.Date, default=datetime.now().date)
    day_started = db.Column(db.Boolean, default=False)
    current_activity_id = db.Column(db.Integer, db.ForeignKey('activity.id'))
    end_date = db.Column(db.Date)

    def get_first_activity_of_day(self):
        return Activity.query.filter_by(template_id=self.template_id, day=self.current_day).order_by(Activity.start_time).first()

    def get_next_activity(self):
        if self.current_activity_id is not None:
            current_activity = db.session.get(Activity, self.current_activity_id)
            if current_activity:
                return Activity.query.filter_by(template_id=self.template_id, day=self.current_day).filter(Activity.start_time > current_activity.start_time).order_by(Activity.start_time).first()
        return None

    def get_day_activities(self):
        return Activity.query.filter_by(template_id=self.template_id, day=self.current_day).order_by(Activity.start_time).all()

def run_node_script(script, args=None):
    cmd = ['node', '-e', script]
    if args:
        cmd.extend(args)
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.stdout.strip()

@app.route('/')
def dashboard():
    active_sessions = Session.query.all()
    templates = Template.query.all()
    return render_template('dashboard.html', sessions=active_sessions, templates=templates)

@app.route('/setup', methods=['GET', 'POST'])
def setup():
    if request.method == 'POST':
        data = request.json
        if 'id' in data:  # Updating existing template
            template = db.session.get(Template, data['id'])
            if template:
                template.name = data['name']
                template.description = data['description']
                template.duration = data['duration']
                
                # Delete existing activities
                Activity.query.filter_by(template_id=template.id).delete()
                
                # Add new activities
                for activity in data['activities']:
                    new_activity = Activity(
                        template_id=template.id,
                        day=activity['day'],
                        name=activity['name'],
                        description=activity['description'],
                        start_time=activity['start_time'],
                        duration=activity['duration']
                    )
                    db.session.add(new_activity)
                
                db.session.commit()
                return jsonify({"success": True, "message": "Template updated successfully"})
            else:
                return jsonify({"success": False, "message": "Template not found"}), 404
        else:  # Creating new template
            new_template = Template(
                name=data['name'],
                description=data['description'],
                duration=data['duration']
            )
            db.session.add(new_template)
            db.session.flush()  # This will assign an id to new_template
            
            for activity in data['activities']:
                new_activity = Activity(
                    template_id=new_template.id,
                    day=activity['day'],
                    name=activity['name'],
                    description=activity['description'],
                    start_time=activity['start_time'],
                    duration=activity['duration']
                )
                db.session.add(new_activity)
            
            db.session.commit()
            return jsonify({"success": True, "message": "Template created successfully"})

    templates = Template.query.all()
    return render_template('setup.html', templates=templates)

@app.route('/get_template/<int:template_id>')
def get_template(template_id):
    template = db.session.get(Template, template_id)
    if template:
        activities = Activity.query.filter_by(template_id=template_id).all()
        return jsonify({
            "id": template.id,
            "name": template.name,
            "description": template.description,
            "duration": template.duration,
            "activities": [activity.to_dict() for activity in activities]
        })
    return jsonify({"error": "Template not found"}), 404

@app.route('/start_session', methods=['POST'])
def start_session():
    app.logger.info(f"Received start_session request: {request.form}")
    template_id = request.form.get('template_id')
    session_name = request.form.get('session_name')

    if not template_id or not session_name:
        app.logger.error("Missing template_id or session_name")
        return jsonify({"success": False, "message": "Missing template_id or session_name"}), 400

    try:
        script = f"""
        const db = require('./server/database');
        db.createSession({template_id}, '{session_name}')
          .then(id => console.log(id))
          .catch(err => console.error(err));
        """
        session_id = int(run_node_script(script))
        app.logger.info(f"Created new session: {session_id}")
        return jsonify({"success": True, "session_id": session_id})
    except Exception as e:
        app.logger.error(f"Error creating session: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/start_day/<int:session_id>', methods=['POST'])
def start_day(session_id):
    session = db.session.get(Session, session_id)
    if not session:
        return jsonify({"success": False, "message": "Session not found"}), 404
    if not session.day_started:
        session.day_started = True
        first_activity = session.get_first_activity_of_day()
        if first_activity:
            session.current_activity_id = first_activity.id
            first_activity.actual_start_time = datetime.now().strftime("%H:%M")
        db.session.commit()
        return jsonify({"success": True, "message": "Day started successfully"})
    return jsonify({"success": False, "message": "Day already started"})

@app.route('/end_day/<int:session_id>', methods=['POST'])
def end_day(session_id):
    session = db.session.get(Session, session_id)
    if not session:
        return jsonify({"success": False, "message": "Session not found"}), 404
    if session.current_activity_id:
        current_activity = db.session.get(Activity, session.current_activity_id)
        if current_activity and not current_activity.actual_end_time:
            current_activity.actual_end_time = datetime.now().strftime("%H:%M")
            start_time = datetime.strptime(current_activity.actual_start_time, "%H:%M")
            end_time = datetime.strptime(current_activity.actual_end_time, "%H:%M")
            current_activity.actual_duration = int((end_time - start_time).total_seconds() / 60)
    session.current_day += 1
    session.day_started = False
    session.current_activity_id = None
    if session.current_day > session.template.duration:
        session.end_date = datetime.now().date()
    db.session.commit()
    return jsonify({"success": True})

@app.route('/move_to_next_activity/<int:session_id>', methods=['POST'])
def move_to_next_activity(session_id):
    session = db.session.get(Session, session_id)
    if not session:
        return jsonify({"success": False, "message": "Session not found"}), 404
    if session.current_activity_id is not None:
        current_activity = db.session.get(Activity, session.current_activity_id)
        if current_activity:
            current_activity.completed = True
            current_activity.actual_end_time = datetime.now().strftime("%H:%M")
            start_time = datetime.strptime(current_activity.actual_start_time, "%H:%M")
            end_time = datetime.strptime(current_activity.actual_end_time, "%H:%M")
            current_activity.actual_duration = int((end_time - start_time).total_seconds() / 60)
            next_activity = session.get_next_activity()
            if next_activity:
                session.current_activity_id = next_activity.id
                next_activity.actual_start_time = datetime.now().strftime("%H:%M")
            else:
                session.current_activity_id = None
            db.session.commit()
            return jsonify({"success": True, "message": "Moved to next activity successfully"})
    return jsonify({"success": False, "message": "No current activity to move from"})

@app.route('/undo_move/<int:session_id>', methods=['POST'])
def undo_move(session_id):
    session = db.session.get(Session, session_id)
    if not session:
        return jsonify({"success": False, "message": "Session not found"}), 404
    
    current_activity = db.session.get(Activity, session.current_activity_id) if session.current_activity_id else None
    previous_activity = Activity.query.filter_by(template_id=session.template_id, day=session.current_day).filter(Activity.start_time < current_activity.start_time).order_by(Activity.start_time.desc()).first() if current_activity else None
    
    if previous_activity:
        if current_activity:
            current_activity.actual_start_time = None
            current_activity.actual_end_time = None
            current_activity.actual_duration = None
        previous_activity.completed = False
        previous_activity.actual_end_time = None
        previous_activity.actual_duration = None
        session.current_activity_id = previous_activity.id
        db.session.commit()
        return jsonify({"success": True, "message": "Undo successful"})
    
    return jsonify({"success": False, "message": "Cannot undo, no previous activity found"})

@app.route('/get_session_status/<int:session_id>')
def get_session_status(session_id):
    session = db.session.get(Session, session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404

    current_activity = None
    if session.current_activity_id is not None:
        current_activity = db.session.get(Activity, session.current_activity_id)

    next_activity = session.get_next_activity()
    day_activities = session.get_day_activities()
    is_last_activity = next_activity is None

    return jsonify({
        "current_day": session.current_day,
        "day_started": session.day_started,
        "current_activity": current_activity.to_dict() if current_activity else None,
        "next_activity": next_activity.to_dict() if next_activity else None,
        "day_activities": [activity.to_dict() for activity in day_activities],
        "is_last_activity": is_last_activity
    })

@app.route('/statistics')
def statistics():
    # Get total sessions
    total_sessions = Session.query.count()
    
    # Get total completed activities
    total_activities_completed = Activity.query.filter_by(completed=True).count()
    
    # Calculate average duration for completed activities
    avg_duration = db.session.query(
        db.func.avg(Activity.actual_duration)
    ).filter(
        Activity.completed == True,
        Activity.actual_duration.isnot(None)
    ).scalar()
    avg_duration = round(avg_duration) if avg_duration else 0
    
    # Find most common activity
    most_common = db.session.query(
        Activity.name,
        db.func.count(Activity.id).label('count')
    ).filter(
        Activity.completed == True
    ).group_by(
        Activity.name
    ).order_by(
        db.desc('count')
    ).first()
    
    most_common_activity = most_common.name if most_common else "N/A"
    most_common_count = most_common[1] if most_common else 0

    stats = {
        'total_sessions': total_sessions,
        'total_activities_completed': total_activities_completed,
        'average_activity_duration': f"{avg_duration} minutes",
        'most_common_activity': f"{most_common_activity} (completed {most_common_count} times)"
    }
    
    return render_template('statistics.html', stats=stats)

    stats = {
        'total_sessions': total_sessions,
        'total_activities_completed': total_activities_completed,
        'average_activity_duration': f"{avg_duration} minutes",
        'most_common_activity': f"{most_common_activity} (completed {most_common_count} times)"
    }
    
    return render_template('statistics.html', stats=stats)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=9999, debug=True)