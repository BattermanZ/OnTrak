import pymongo
from datetime import datetime, timedelta
import random
from bson import ObjectId
import bcrypt

# MongoDB connection
client = pymongo.MongoClient("mongodb://localhost:27017/")
db = client["ontrak"]

# Trainer personality types for time management with more extreme variations
PERSONALITY_TYPES = {
    "Early Bird": {
        "early_prob": 0.7,
        "on_time_prob": 0.2,
        "late_prob": 0.1,
        "base_variance": (-45, -15),  # Much earlier
        "variance_multiplier": (0.8, 1.2)  # Variation in their consistency
    },
    "Procrastinator": {
        "early_prob": 0.1,
        "on_time_prob": 0.2,
        "late_prob": 0.7,
        "base_variance": (15, 45),  # Much later
        "variance_multiplier": (0.9, 1.4)  # More variation when late
    },
    "Perfectionist": {
        "early_prob": 0.1,
        "on_time_prob": 0.3,
        "late_prob": 0.6,
        "base_variance": (10, 30),  # Takes longer due to attention to detail
        "variance_multiplier": (1.0, 1.3)
    },
    "Rusher": {
        "early_prob": 0.6,
        "on_time_prob": 0.3,
        "late_prob": 0.1,
        "base_variance": (-30, -10),  # Rushes through activities
        "variance_multiplier": (0.6, 0.9)  # Consistently faster
    },
    "Chaotic": {
        "early_prob": 0.33,
        "on_time_prob": 0.34,
        "late_prob": 0.33,
        "base_variance": (-60, 60),  # Extreme variations
        "variance_multiplier": (0.5, 1.5)  # Very inconsistent
    }
}

# Activities that tend to take longer or shorter than scheduled
ACTIVITY_BIASES = {
    "Team Building Exercise": {"variance_multiplier": (1.2, 1.5)},  # Always takes longer
    "Code Review": {"variance_multiplier": (1.1, 1.4)},  # Usually takes longer
    "Coffee Break": {"variance_multiplier": (0.8, 1.2)},  # Variable duration
    "Daily Standup": {"variance_multiplier": (0.7, 0.9)},  # Usually shorter
    "Documentation": {"variance_multiplier": (1.3, 1.6)},  # Takes much longer
    "Testing": {"variance_multiplier": (1.2, 1.4)},  # Takes longer
    "Deployment": {"variance_multiplier": (0.5, 1.5)},  # Very unpredictable
}

def create_fake_trainer(personality_type, used_emails):
    """Create a fake trainer with a specific personality type"""
    first_names = ["Alex", "Jordan", "Sam", "Taylor", "Morgan", "Casey", "Jamie", "Riley", "Avery", "Quinn"]
    last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"]
    
    # Keep trying until we get a unique email
    while True:
        first_name = random.choice(first_names)
        last_name = random.choice(last_names)
        email = f"{first_name.lower()}.{last_name.lower()}@example.com"
        
        if email not in used_emails:
            used_emails.add(email)
            break
    
    # Hash password using bcrypt
    password = "password123"  # Default password for testing
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    
    trainer = {
        "_id": ObjectId(),
        "email": email,
        "password": hashed,
        "firstName": first_name,
        "lastName": last_name,
        "role": "trainer",
        "active": True,
        "lastLogin": datetime.now(),
        "createdAt": datetime.now(),
        "updatedAt": datetime.now(),
        "personality": personality_type
    }
    return trainer

def get_time_variance(trainer_personality, activity_name, scheduled_duration):
    """Generate time variance based on trainer personality, activity, and duration"""
    personality = PERSONALITY_TYPES[trainer_personality]
    prob = random.random()
    
    # Get base variance based on personality probability
    if prob < personality["early_prob"]:
        # Early completion
        base_variance = random.uniform(personality["base_variance"][0], min(-1, personality["base_variance"][1]))
    elif prob < personality["early_prob"] + personality["on_time_prob"]:
        # On time (-5 to +5 minutes)
        base_variance = random.uniform(-5, 5)
    else:
        # Late completion
        base_variance = random.uniform(max(1, personality["base_variance"][0]), personality["base_variance"][1])
    
    # Apply personality-based multiplier
    personality_multiplier = random.uniform(*personality["variance_multiplier"])
    variance = base_variance * personality_multiplier
    
    # Apply activity-specific bias if it exists
    if activity_name in ACTIVITY_BIASES:
        activity_multiplier = random.uniform(*ACTIVITY_BIASES[activity_name]["variance_multiplier"])
        variance *= activity_multiplier
    
    # Scale variance based on activity duration (longer activities can have more variance)
    duration_scale = max(1, scheduled_duration / 30)  # Scale factor based on 30-minute baseline
    scaled_variance = int(variance * duration_scale)
    
    # Add some random noise to prevent too uniform results
    noise = random.randint(-5, 5)
    
    return scaled_variance + noise

def create_training_session(trainer, template, start_date, day_number):
    """Create a training session with actual start and end times"""
    session = {
        "_id": ObjectId(),
        "title": f"{template['name']} - Day {day_number}",
        "date": start_date,
        "templateId": template["_id"],
        "selectedDay": day_number,
        "activities": [],
        "activeActivityIndex": 0,
        "status": "completed",
        "createdBy": trainer["_id"],
        "createdAt": start_date,
        "updatedAt": start_date
    }
    
    # Filter activities for selected day
    day_activities = [a for a in template["activities"] if a["day"] == day_number]
    
    if not day_activities:
        print(f"Warning: No activities found for day {day_number}")
        return None
    
    # Track cumulative delay for the day
    cumulative_delay = timedelta(minutes=0)
    
    for activity in day_activities:
        try:
            scheduled_start = datetime.strptime(activity["startTime"], "%H:%M").time()
            scheduled_start_dt = datetime.combine(start_date.date(), scheduled_start)
            
            # Generate variance based on trainer's personality and activity
            variance = get_time_variance(
                trainer["personality"],
                activity["name"],
                activity["duration"]
            )
            
            # Calculate actual times, considering cumulative delay
            actual_start = scheduled_start_dt + cumulative_delay
            actual_duration = max(1, activity["duration"] + variance)
            actual_end = actual_start + timedelta(minutes=actual_duration)
            
            # Update cumulative delay for next activity
            scheduled_end = scheduled_start_dt + timedelta(minutes=activity["duration"])
            cumulative_delay = actual_end - scheduled_end
            
            session_activity = {
                "_id": ObjectId(),
                "name": activity["name"],
                "startTime": activity["startTime"],
                "duration": activity["duration"],
                "description": activity.get("description", ""),
                "day": activity["day"],
                "completed": True,
                "isActive": False,
                "actualStartTime": actual_start,
                "actualEndTime": actual_end
            }
            session["activities"].append(session_activity)
        except Exception as e:
            print(f"Error processing activity {activity.get('name', 'unknown')}: {str(e)}")
            continue
    
    return session if session["activities"] else None

def main():
    try:
        # Clear existing data
        db.users.delete_many({"role": "trainer"})
        db.schedules.delete_many({})
        
        # Get the template for 14-Day Development Sprint
        template = db.templates.find_one({"name": "14-Day Development Sprint"})
        if not template:
            print("Error: 14-Day Development Sprint template not found")
            return
        
        # Create trainers with different personalities
        trainers = []
        used_emails = set()
        for personality in PERSONALITY_TYPES.keys():
            trainer = create_fake_trainer(personality, used_emails)
            db.users.insert_one({k: v for k, v in trainer.items() if k != "personality"})
            trainers.append(trainer)
        
        # Generate training sessions
        base_start_date = datetime.now() - timedelta(days=70)  # Start from 70 days ago
        sessions_created = 0
        
        for trainer in trainers:
            # Create 5 full trainings per trainer
            trainer_start_date = base_start_date
            for training_num in range(5):
                for day in range(1, template["days"] + 1):
                    session = create_training_session(trainer, template, trainer_start_date, day)
                    if session:
                        db.schedules.insert_one(session)
                        sessions_created += 1
                    trainer_start_date += timedelta(days=1)
                trainer_start_date += timedelta(days=2)  # Add a 2-day gap between trainings
        
        print(f"Successfully created {len(trainers)} trainers")
        print(f"Successfully created {sessions_created} training sessions")
        
    except Exception as e:
        print(f"An error occurred: {str(e)}")

if __name__ == "__main__":
    main() 