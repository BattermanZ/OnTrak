#!/usr/bin/env python3
import os
import sys
import random
from datetime import datetime, timedelta
from typing import List, Dict
import pymongo
from pymongo import MongoClient
from bson import ObjectId
import bcrypt
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
WORKDAY_START = "09:00"
WORKDAY_END = "17:30"
LUNCH_DURATION = 30  # minutes
MIN_ACTIVITY_DURATION = 30  # minutes
MAX_ACTIVITY_DURATION = 120  # minutes

# Day variance factors (in minutes) - some days run early, some late
DAY_VARIANCE = {
    1: {'range': (-5, 5), 'description': 'First day - mostly on time'},
    2: {'range': (-15, -5), 'description': 'Second day - tends to run early'},
    3: {'range': (5, 15), 'description': 'Third day - tends to run late'},
    4: {'range': (-10, 0), 'description': 'Fourth day - slightly early'},
    5: {'range': (0, 10), 'description': 'Fifth day - slightly late'},
    6: {'range': (-20, -10), 'description': 'Sixth day - runs very early'},
    7: {'range': (10, 20), 'description': 'Seventh day - runs very late'},
    8: {'range': (-5, 5), 'description': 'Eighth day - mostly on time'},
    9: {'range': (5, 15), 'description': 'Ninth day - tends to run late'},
    10: {'range': (-15, -5), 'description': 'Tenth day - tends to run early'},
    11: {'range': (0, 10), 'description': 'Day 11 - slightly late'},
    12: {'range': (-10, 0), 'description': 'Day 12 - slightly early'},
    13: {'range': (5, 15), 'description': 'Day 13 - tends to run late'},
    14: {'range': (-5, 5), 'description': 'Day 14 - mostly on time'},
    15: {'range': (-15, -5), 'description': 'Day 15 - tends to run early'}
}

# Trainer personality types with variance ranges in minutes
TRAINER_TYPES = {
    'Early Bird': {'variance_range': (-10, 0)},    # Always starts early
    'Punctual': {'variance_range': (-5, 5)},       # Mostly on time
    'Rusher': {'variance_range': (-5, 10)},        # Slightly variable
    'Relaxed': {'variance_range': (0, 15)},        # Tends to run late
    'Procrastinator': {'variance_range': (5, 20)}, # Usually late
    'Chaotic': {'variance_range': (-15, 15)}       # Highly variable
}

# Activity types with descriptions
ACTIVITY_TYPES = {
    'Customer Interaction': {
        'chat_descriptions': [
            ('Live Chat Handling', 'Learn to manage customer conversations effectively in a chat environment. See guide: https://support.example.com/chat-guide'),
            ('Multi-Chat Management', 'Master handling multiple customer chats simultaneously. Reference: https://support.example.com/multi-chat'),
            ('Chat Etiquette', 'Professional communication standards for chat support. Guidelines: https://support.example.com/chat-etiquette')
        ],
        'call_descriptions': [
            ('Call Handling Basics', 'Master the fundamentals of professional call handling. Manual: https://support.example.com/call-basics'),
            ('Voice Modulation', 'Learn proper voice control and tone. Guide: https://support.example.com/voice-guide'),
            ('Call Control', 'Techniques for maintaining productive customer calls. Tips: https://support.example.com/call-control')
        ]
    },
    'Technical Skills': {
        'chat_descriptions': [
            ('Typing Speed Training', 'Improve typing efficiency and accuracy. Practice here: https://support.example.com/typing'),
            ('Shortcut Management', 'Learn essential keyboard shortcuts. Reference: https://support.example.com/shortcuts'),
            ('Template Usage', 'Effective use of response templates. Library: https://support.example.com/templates')
        ],
        'call_descriptions': [
            ('Phone System Training', 'Understanding the call center system. Manual: https://support.example.com/phone-system'),
            ('Call Transfer Protocol', 'Proper procedures for transferring calls. Guide: https://support.example.com/transfers'),
            ('Hold Management', 'Best practices for putting calls on hold. Reference: https://support.example.com/hold-guide')
        ]
    },
    'Soft Skills': {
        'chat_descriptions': [
            ('Written Communication', 'Enhance written communication skills. Resources: https://support.example.com/writing'),
            ('Emoji Usage Guidelines', 'Professional use of emojis in customer service. Guide: https://support.example.com/emoji-guide'),
            ('Chat Tone', 'Maintaining appropriate tone in written support. Tips: https://support.example.com/chat-tone')
        ],
        'call_descriptions': [
            ('Verbal Communication', 'Effective verbal communication techniques. Guide: https://support.example.com/verbal'),
            ('Active Listening', 'Developing active listening skills. Tips: https://support.example.com/listening'),
            ('Voice Tone', 'Managing voice tone for better customer experience. Reference: https://support.example.com/voice-tone')
        ]
    },
    'Procedures': {
        'chat_descriptions': [
            ('Escalation Process', 'Understanding when and how to escalate chats. Protocol: https://support.example.com/chat-escalation'),
            ('Chat Queue Management', 'Managing multiple customers in queue. Guide: https://support.example.com/chat-queue'),
            ('Response Times', 'Meeting response time standards. Metrics: https://support.example.com/response-times')
        ],
        'call_descriptions': [
            ('Call Routing', 'Understanding call routing procedures. Manual: https://support.example.com/routing'),
            ('Queue Management', 'Managing calls in queue effectively. Guide: https://support.example.com/queue'),
            ('Response Scripts', 'Using response scripts appropriately. Library: https://support.example.com/scripts')
        ]
    }
}

def connect_to_mongodb():
    """Connect to MongoDB and return database instance."""
    try:
        client = MongoClient('mongodb://localhost:27017/')
        db = client.ontrak
        return db
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        sys.exit(1)

def create_trainer(personality_type: str, db) -> ObjectId:
    """Create a trainer with specified personality type."""
    try:
        # Generate realistic names
        first_names = ['James', 'Emma', 'Michael', 'Sarah', 'David', 'Lisa', 'John', 'Maria', 'Robert', 'Anna']
        last_names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez']
        
        first_name = random.choice(first_names)
        last_name = random.choice(last_names)
        email = f"{first_name.lower()}.{last_name.lower()}@example.com"
        
        # Hash password
    salt = bcrypt.gensalt()
        password = bcrypt.hashpw('password123'.encode('utf-8'), salt)
    
    trainer = {
            'email': email,
            'firstName': first_name,
            'lastName': last_name,
            'password': password,
            'role': 'trainer',
            'personality': personality_type,
            'active': True,
            'createdAt': datetime.now(),
            'lastLogin': datetime.now()
        }
        
        result = db.users.insert_one(trainer)
        logger.info(f"Created trainer: {first_name} {last_name} ({personality_type})")
        return result.inserted_id
    except Exception as e:
        logger.error(f"Failed to create trainer: {e}")
        return None

def parse_time(time_str: str) -> datetime:
    """Convert time string to datetime object."""
    hour, minute = map(int, time_str.split(':'))
    now = datetime.now()
    return now.replace(hour=hour, minute=minute, second=0, microsecond=0)

def generate_activity_time(start_time: datetime, min_duration: int, max_duration: int) -> tuple:
    """Generate random activity duration and end time."""
    # Calculate remaining time until end of day
    end_time = parse_time(WORKDAY_END)
    remaining_minutes = int((end_time - start_time).total_seconds() / 60)
    
    # If less than minimum duration left, return minimum duration
    if remaining_minutes < min_duration:
        duration = min_duration
    else:
        # Use the minimum between max_duration and remaining time
        adjusted_max = min(max_duration, remaining_minutes)
        duration = random.randint(min_duration, adjusted_max)
    
    end_time = start_time + timedelta(minutes=duration)
    return duration, end_time

def create_training_template(name: str, num_days: int, training_type: str, trainer_id: ObjectId, db) -> ObjectId:
    """Create training template with specified number of days."""
    try:
        template = {
            'name': name,
            'description': f'{name} - {num_days} day training program',
            'tags': ['customer-service', training_type],
            'days': num_days,
            'activities': [],
            'createdBy': trainer_id,
            'createdAt': datetime.utcnow(),
            'updatedAt': datetime.utcnow()
        }

        current_time = parse_time(WORKDAY_START)
        end_time = parse_time(WORKDAY_END)
        
        # Keep track of used activity names
        used_names = set()
        
        for day in range(num_days):
            day_current_time = current_time
            
            # Number of activities for this day
            num_activities = random.randint(6, 12)
            
            for activity_num in range(num_activities):
                # Ensure we don't exceed workday end time
                if day_current_time >= end_time:
                    break
                    
                # Generate activity duration and end time
                duration, activity_end = generate_activity_time(
                    day_current_time, 
                    MIN_ACTIVITY_DURATION, 
                    min(MAX_ACTIVITY_DURATION, int((end_time - day_current_time).total_seconds() / 60))
                )
                
                # Select random activity type and description
                activity_category = random.choice(list(ACTIVITY_TYPES.keys()))
                descriptions = ACTIVITY_TYPES[activity_category][f'{training_type.lower()}_descriptions']
                title, description = random.choice(descriptions)
                
                # Ensure unique name by adding a number if needed
                base_name = title
                counter = 1
                while title in used_names:
                    title = f"{base_name} ({counter})"
                    counter += 1
                used_names.add(title)
                
                activity = {
                    'name': title,
                    'startTime': day_current_time.strftime('%H:%M'),
                    'duration': duration,
                    'description': description,
                    'day': day + 1,
                    'isActive': False
                }
                
                template['activities'].append(activity)
                day_current_time = activity_end + timedelta(minutes=5)  # 5-minute break between activities
        
        result = db.templates.insert_one(template)
        logger.info(f"Created template: {name} with {len(template['activities'])} activities")
        return result.inserted_id
    except Exception as e:
        logger.error(f"Failed to create template: {e}")
        return None

def calculate_actual_times(scheduled_time: str, trainer_personality: str, schedule_date: datetime, day: int, duration: int) -> tuple:
    """Calculate actual start/end times based on personality and day variance."""
    # Get trainer personality variance
    trainer_variance_range = TRAINER_TYPES[trainer_personality]['variance_range']
    trainer_variance = random.randint(*trainer_variance_range)
    
    # Get day-specific variance
    day_variance_range = DAY_VARIANCE.get(day, {'range': (-5, 5)})['range']
    day_variance = random.randint(*day_variance_range)
    
    # Combine variances (both trainer personality and day-specific factors)
    start_variance = trainer_variance + day_variance
    
    # Calculate duration variance (between -10% and +20% of scheduled duration)
    min_duration_variance = max(-int(duration * 0.1), -15)  # Cap negative variance at -15 minutes
    max_duration_variance = min(int(duration * 0.2), 30)    # Cap positive variance at +30 minutes
    
    # Adjust variance based on trainer personality
    if trainer_personality == 'Early Bird':
        max_duration_variance = min(max_duration_variance, 15)  # Early birds tend to finish on time
    elif trainer_personality == 'Procrastinator':
        min_duration_variance = max(0, min_duration_variance)   # Procrastinators never finish early
    elif trainer_personality == 'Chaotic':
        min_duration_variance = min_duration_variance * 2       # Chaotic trainers have wider variance
        max_duration_variance = max_duration_variance * 2
    
    duration_variance = random.randint(min_duration_variance, max_duration_variance)
    actual_duration = max(duration + duration_variance, int(duration * 0.5))  # Ensure at least 50% of scheduled duration
    
    # Convert scheduled_time to datetime using schedule_date
    hour, minute = map(int, scheduled_time.split(':'))
    scheduled_dt = schedule_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
    actual_start = scheduled_dt + timedelta(minutes=start_variance)
    actual_end = actual_start + timedelta(minutes=actual_duration)
    
    return actual_start.isoformat(), actual_end.isoformat()

def generate_completed_training(trainer_id: ObjectId, template_id: ObjectId, db) -> bool:
    """Generate a completed training instance with activities processed sequentially."""
    try:
        template = db.templates.find_one({'_id': template_id})
        trainer = db.users.find_one({'_id': trainer_id})
        
        if not template or not trainer:
            logger.error("Template or trainer not found")
            return False
        
        # For each day in the template
        for day in range(1, template['days'] + 1):
            # Start date is random within last 60 days (not future)
            start_date = datetime.now() - timedelta(days=random.randint(1, 60))
            
            # Get activities for this day
            day_activities = [a for a in template['activities'] if a['day'] == day]
            
            if not day_activities:
                logger.warning(f"No activities found for day {day}")
                continue
            
            # Create schedule for this day
            schedule = {
                'templateId': template_id,
                'trainerId': trainer_id,
                'createdBy': trainer_id,
                'title': f"{template['name']} - Day {day}",
                'date': start_date,
                'status': 'completed',
                'activities': [],
                'day': day
            }
            
            # Process activities sequentially
            current_time = start_date
            for i, activity in enumerate(day_activities):
                # Calculate actual start and end times based on trainer personality and day variance
                actual_start, actual_end = calculate_actual_times(
                    activity['startTime'],
                    trainer['personality'],
                    start_date,
                    day,
                    activity['duration']
                )
                
                activity_copy = activity.copy()
                activity_copy.update({
                    'status': 'completed',
                    'isActive': False,
                    'completed': True,
                    'actualStartTime': actual_start,
                    'actualEndTime': actual_end
                })
                
                schedule['activities'].append(activity_copy)
            
            result = db.schedules.insert_one(schedule)
            logger.info(f"Created completed training schedule: {template['name']} - Day {day}")
        
        return True
        except Exception as e:
        logger.error(f"Failed to generate completed training: {e}")
        return False

def main():
    try:
        # Connect to MongoDB
        client = MongoClient('mongodb://localhost:27017/')
        db = client['ontrak']
        
        # Create trainers with different personality types
        trainer_ids = {}
        for personality in TRAINER_TYPES.keys():
            trainer_id = create_trainer(personality, db)
            if trainer_id:
                trainer_ids[personality] = trainer_id
        
        # Create templates, each created by a random trainer
        templates = {
            'chat': create_training_template(
                'Chat Support Training',
                10,
                'chat',
                random.choice(list(trainer_ids.values())),
                db
            ),
            'call': create_training_template(
                'Call Center Training',
                15,
                'call',
                random.choice(list(trainer_ids.values())),
                db
            )
        }
        
        # Generate 5 complete training sessions for each trainer and each template
        for personality, trainer_id in trainer_ids.items():
            logger.info(f"Generating trainings for {personality} trainer")
            for template_name, template_id in templates.items():
                if template_id:
                    logger.info(f"Generating {template_name} trainings")
                    for i in range(5):  # 5 complete training sessions
                        if generate_completed_training(trainer_id, template_id, db):
                            logger.info(f"Completed {template_name} training session {i+1}/5 for {personality} trainer")
                        else:
                            logger.error(f"Failed to generate {template_name} training session {i+1} for {personality} trainer")
        
        logger.info("Data generation completed successfully!")
        
    except Exception as e:
        logger.error(f"Failed to generate data: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    main() 