from pymongo import MongoClient
from datetime import datetime, timedelta
import random
from bson import ObjectId

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client.ontrak

# Activity names and descriptions
activities = [
    ("Team Stand-up", "Daily team sync and progress update"),
    ("Code Review", "Review and provide feedback on team's code"),
    ("Technical Planning", "Architecture and design discussions"),
    ("Development", "Focused coding session"),
    ("Testing", "Quality assurance and bug fixing"),
    ("Documentation", "Update technical documentation"),
    ("Client Meeting", "Progress updates and feedback"),
    ("Break", "Short break for refreshment"),
]

def generate_day_activities(day):
    """Generate activities for a single day from 9:00 to 17:30"""
    day_activities = []
    current_time = "09:00"
    end_time = "17:30"
    
    while current_time < end_time:
        # Random duration between 30 and 90 minutes
        duration = random.choice([30, 45, 60, 90])
        activity_name, description = random.choice(activities)
        
        # Create activity
        activity = {
            "_id": ObjectId(),
            "name": activity_name,
            "startTime": current_time,
            "duration": duration,
            "description": description,
            "day": day
        }
        day_activities.append(activity)
        
        # Calculate next start time
        hours, minutes = map(int, current_time.split(':'))
        next_time = datetime.strptime(current_time, "%H:%M") + timedelta(minutes=duration)
        current_time = next_time.strftime("%H:%M")
    
    return day_activities

# Find a user (admin)
user = db.users.find_one({"role": "admin"})
if not user:
    print("No admin user found. Please create one first.")
    exit(1)

print(f"Using user: {user['email']}")

# Create template
template = {
    "name": "14-Day Development Sprint",
    "days": 14,
    "createdBy": user['_id'],
    "activities": [],
    "createdAt": datetime.utcnow(),
    "updatedAt": datetime.utcnow()
}

# Generate activities for each day
for day in range(1, 15):
    template["activities"].extend(generate_day_activities(day))

# Insert template
result = db.templates.insert_one(template)
print(f"Created template with ID: {result.inserted_id}")

# Print summary
activities_by_day = {}
for activity in template["activities"]:
    day = activity["day"]
    if day not in activities_by_day:
        activities_by_day[day] = []
    activities_by_day[day].append(activity)

for day in sorted(activities_by_day.keys()):
    print(f"\nDay {day}:")
    for activity in sorted(activities_by_day[day], key=lambda x: x["startTime"]):
        print(f"  {activity['startTime']} - {activity['name']} ({activity['duration']} min)")

print("\nTemplate created successfully!") 