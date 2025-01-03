from pymongo import MongoClient
from datetime import datetime
from bson import ObjectId
import random
import sys

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['ontrak']

# First, find a valid user
user = db.users.find_one()
if not user:
    print("Error: No users found in the database. Please create a user first.")
    sys.exit(1)

print(f"Using user: {user.get('email', 'unknown email')}")

# Sample activities for variety
ACTIVITIES = [
    {
        'name': 'Team Stand-up',
        'descriptions': [
            'Daily team sync to discuss progress and blockers',
            'Morning catch-up with the development team',
            'Quick sync with the team to plan the day'
        ]
    },
    {
        'name': 'Client Meeting',
        'descriptions': [
            'Review project progress with the client',
            'Demo new features and gather feedback',
            'Discuss project timeline and deliverables'
        ]
    },
    {
        'name': 'Code Review',
        'descriptions': [
            'Review pull requests from team members',
            'Code quality assessment and feedback',
            'Pair programming session with junior developers'
        ]
    },
    {
        'name': 'Design Workshop',
        'descriptions': [
            'Brainstorming session for new features',
            'UI/UX review with the design team',
            'Product design iteration and feedback'
        ]
    },
    {
        'name': 'Technical Planning',
        'descriptions': [
            'Architecture discussion for upcoming features',
            'System design review and optimization',
            'Sprint planning and task breakdown'
        ]
    },
    {
        'name': 'Documentation',
        'descriptions': [
            'Update technical documentation',
            'Write API documentation',
            'Create user guides for new features'
        ]
    },
    {
        'name': 'Training Session',
        'descriptions': [
            'Knowledge sharing session on new technologies',
            'Team skill development workshop',
            'Technical mentoring session'
        ]
    },
    {
        'name': 'Break',
        'descriptions': [
            'Lunch break and team social time',
            'Coffee break and informal discussions',
            'Short break for refreshment'
        ]
    }
]

def create_activity(day, start_time):
    activity = random.choice(ACTIVITIES)
    duration = random.choice([30, 45, 60, 90, 120])
    
    return {
        '_id': ObjectId(),
        'name': activity['name'],
        'day': day,
        'startTime': start_time,
        'duration': duration,
        'description': random.choice(activity['descriptions'])
    }

def generate_day_activities(day):
    activities = []
    available_times = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00']
    
    # Randomly select number of activities for the day (2-5)
    num_activities = random.randint(2, 5)
    selected_times = random.sample(available_times, num_activities)
    selected_times.sort()
    
    for time in selected_times:
        activities.append(create_activity(day, time))
    
    return activities

# Create template with activities
template = {
    'name': '10-Day Development Sprint',
    'days': 10,
    'createdBy': user['_id'],  # Use the found user's ID
    'activities': [],
    'createdAt': datetime.utcnow(),
    'updatedAt': datetime.utcnow()
}

# Generate activities for each day
for day in range(1, 11):
    template['activities'].extend(generate_day_activities(day))

# Insert the template
result = db.templates.insert_one(template)
print(f"Created template with ID: {result.inserted_id}")
print(f"Total activities created: {len(template['activities'])}")

# Print summary of activities by day
for day in range(1, 11):
    day_activities = [a for a in template['activities'] if a['day'] == day]
    print(f"\nDay {day}: {len(day_activities)} activities")
    for activity in day_activities:
        print(f"  - {activity['startTime']}: {activity['name']} ({activity['duration']} min)") 