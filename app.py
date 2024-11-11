from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, time
import logging

app = Flask(__name__)
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
    start_time = db.Column(db.Time, nullable=False)
    duration = db.Column(db.Integer, nullable=False)
    completed = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "start_time": self.start_time.strftime("%H:%M"),
            "duration": self.duration,
            "completed": self.completed
        }

class Session(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    template_id = db.Column(db.Integer, db.ForeignKey('template.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    current_day = db.Column(db.Integer, default=1)
    day_started = db.Column(db.Boolean, default=False)
    current_activity_id = db.Column(db.Integer, db.ForeignKey('activity.id'))

    def get_first_activity_of_day(self):
        return Activity.query.filter_by(template_id=self.template_id, day=self.current_day).order_by(Activity.start_time).first()

    def get_next_activity(self):
        current_activity = Activity.query.get(self.current_activity_id)
        if current_activity:
            return Activity.query.filter_by(template_id=self.template_id, day=self.current_day).filter(Activity.start_time > current_activity.start_time).order_by(Activity.start_time).first()
        return None

    def get_day_activities(self):
        return Activity.query.filter_by(template_id=self.template_id, day=self.current_day).order_by(Activity.start_time).all()

@app.route('/')
def dashboard():
    active_sessions = Session.query.all()
    templates = Template.query.all()
    return render_template('dashboard.html', sessions=active_sessions, templates=templates)

@app.route('/setup', methods=['GET', 'POST'])
def setup():
    if request.method == 'POST':
        new_template = Template(
            name=request.form['name'],
            description=request.form['description'],
            duration=int(request.form['duration'])
        )
        db.session.add(new_template)
        db.session.commit()

        activity_names = request.form.getlist('activity-name[]')
        activity_days = request.form.getlist('activity-day[]')
        activity_start_times = request.form.getlist('activity-start-time[]')
        activity_durations = request.form.getlist('activity-duration[]')
        activity_descriptions = request.form.getlist('activity-description[]')

        for i in range(len(activity_names)):
            new_activity = Activity(
                template_id=new_template.id,
                day=int(activity_days[i]),
                name=activity_names[i],
                description=activity_descriptions[i],
                start_time=datetime.strptime(activity_start_times[i], '%H:%M').time(),
                duration=int(activity_durations[i])
            )
            db.session.add(new_activity)
        db.session.commit()
        return jsonify({"success": True, "message": "Template created successfully"})
    
    return render_template('setup.html')

@app.route('/start_session', methods=['POST'])
def start_session():
    app.logger.info(f"Received start_session request: {request.form}")
    template_id = request.form.get('template_id')
    session_name = request.form.get('session_name')
    
    if not template_id or not session_name:
        app.logger.error("Missing template_id or session_name")
        return jsonify({"success": False, "message": "Missing template_id or session_name"}), 400
    
    try:
        new_session = Session(template_id=template_id, name=session_name)
        db.session.add(new_session)
        db.session.commit()
        app.logger.info(f"Created new session: {new_session.id}")
        return jsonify({"success": True, "session_id": new_session.id})
    except Exception as e:
        app.logger.error(f"Error creating session: {str(e)}")
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/start_day/<int:session_id>', methods=['POST'])
def start_day(session_id):
    session = Session.query.get_or_404(session_id)
    if not session.day_started:
        session.day_started = True
        first_activity = session.get_first_activity_of_day()
        if first_activity:
            session.current_activity_id = first_activity.id
        db.session.commit()
        return jsonify({"success": True, "message": "Day started successfully"})
    return jsonify({"success": False, "message": "Day already started"})

@app.route('/end_day/<int:session_id>', methods=['POST'])
def end_day(session_id):
    session = Session.query.get_or_404(session_id)
    session.current_day += 1
    session.day_started = False
    session.current_activity_id = None
    if session.current_day > session.template.duration:
        db.session.delete(session)
    db.session.commit()
    return jsonify({"success": True})

@app.route('/skip_activity/<int:session_id>', methods=['POST'])
def skip_activity(session_id):
    session = Session.query.get_or_404(session_id)
    current_activity = Activity.query.get(session.current_activity_id)
    if current_activity:
        current_activity.completed = True
        next_activity = session.get_next_activity()
        if next_activity:
            session.current_activity_id = next_activity.id
        else:
            session.current_activity_id = None
        db.session.commit()
        return jsonify({"success": True, "message": "Activity skipped successfully"})
    return jsonify({"success": False, "message": "No current activity to skip"})

@app.route('/get_session_status/<int:session_id>')
def get_session_status(session_id):
    session = Session.query.get_or_404(session_id)
    current_activity = Activity.query.get(session.current_activity_id) if session.current_activity_id else None
    next_activity = session.get_next_activity()
    day_activities = session.get_day_activities()
    
    return jsonify({
        "current_day": session.current_day,
        "day_started": session.day_started,
        "current_activity": current_activity.to_dict() if current_activity else None,
        "next_activity": next_activity.to_dict() if next_activity else None,
        "day_activities": [activity.to_dict() for activity in day_activities]
    })

@app.route('/statistics')
def statistics():
    # For now, we'll just pass some dummy data
    # In a real application, you'd query the database and calculate actual statistics
    dummy_stats = {
        'total_sessions': 10,
        'total_activities_completed': 150,
        'average_session_duration': '5 days',
        'most_common_activity': 'Lecture'
    }
    return render_template('statistics.html', stats=dummy_stats)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=9999, debug=True)