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

def create_training_template(name: str, num_days: int, training_type: str, db) -> ObjectId:
    """Create training template with specified number of days."""
    try:
        template = {
            'name': name,
            'description': f'{name} - {num_days} day training program',
            'tags': ['customer-service', training_type],
            'days': num_days,  # Add total number of days
            'activities': [],  # Activities will be moved here
            'createdAt': datetime.utcnow(),
            'updatedAt': datetime.utcnow()
        }

        current_time = parse_time(WORKDAY_START)
        end_time = parse_time(WORKDAY_END)
        
        for day in range(num_days):
            day_current_time = current_time
            
            # Number of activities for this day
            num_activities = random.randint(6, 12)
            
            for _ in range(num_activities):
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
                
                activity = {
                    'name': title,
                    'startTime': day_current_time.strftime('%H:%M'),
                    'duration': duration,
                    'description': description,
                    'day': day + 1,
                    'isActive': True
                }
                
                template['activities'].append(activity)
                day_current_time = activity_end + timedelta(minutes=5)  # 5-minute break between activities
        
        result = db.templates.insert_one(template)
        logger.info(f"Created template: {name} with {len(template['activities'])} activities")
        return result.inserted_id
    except Exception as e:
        logger.error(f"Failed to create template: {e}")
        return None

def calculate_actual_times(scheduled_time: str, trainer_personality: str, schedule_date: datetime) -> tuple:
    """Calculate actual start/end times based on personality."""
    variance_range = TRAINER_TYPES[trainer_personality]['variance_range']
    variance = random.randint(*variance_range)
    
    # Convert scheduled_time to datetime using schedule_date
    hour, minute = map(int, scheduled_time.split(':'))
    scheduled_dt = schedule_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
    actual_start = scheduled_dt + timedelta(minutes=variance)
    
    return actual_start.isoformat()

def generate_completed_training(trainer_id: ObjectId, template_id: ObjectId, db) -> bool:
    """Generate a completed training instance with all activities marked complete."""
    try:
        template = db.templates.find_one({'_id': template_id})
        trainer = db.users.find_one({'_id': trainer_id})
        
        if not template or not trainer:
            logger.error("Template or trainer not found")
            return False
        
        # Start date is random within last 60 days (not future)
        start_date = datetime.now() - timedelta(days=random.randint(1, 60))
        
        # First create the schedule as active with first activity in progress
        schedule = {
            'templateId': template_id,
            'trainerId': trainer_id,
            'createdBy': trainer_id,  # Set createdBy to the trainer
            'title': template['name'],
            'date': start_date,
            'status': 'active',
            'activities': [],
            'activeActivityIndex': 0
        }
        
        # Process activities sequentially as they would happen in real training
        current_time = start_date
        for i, activity in enumerate(template['activities']):
            # Calculate actual start time based on trainer personality
            actual_start = calculate_actual_times(
                activity['startTime'],
                trainer['personality'],
                start_date
            )
            actual_start_dt = datetime.fromisoformat(actual_start)
            
            # Calculate actual end time (duration may vary slightly)
            duration_variance = random.randint(-5, 10)  # -5 to +10 minutes variance
            actual_duration = activity['duration'] + duration_variance
            actual_end_dt = actual_start_dt + timedelta(minutes=actual_duration)
            
            activity_copy = activity.copy()
            activity_copy.update({
                'completed': True,
                'isActive': False,
                'status': 'completed',
                'actualStartTime': actual_start,
                'actualEndTime': actual_end_dt.isoformat()
            })
            
            schedule['activities'].append(activity_copy)
            current_time = actual_end_dt + timedelta(minutes=random.randint(2, 5))  # Small break between activities
        
        # Mark the schedule as completed
        schedule['status'] = 'completed'
        schedule['activeActivityIndex'] = len(schedule['activities']) - 1  # Last activity
        
        result = db.schedules.insert_one(schedule)
        logger.info(f"Created completed training schedule: {template['name']}")
        return True
    except Exception as e:
        logger.error(f"Failed to generate completed training: {e}")
        return False

def main():
    """Main function to generate all required data."""
    db = connect_to_mongodb()
    
    # Create training templates
    chat_template = create_training_template(
        "Chat Support Training",
        random.randint(10, 20),
        "chat",
        db
    )
    
    call_template = create_training_template(
        "Call Center Training",
        random.randint(10, 20),
        "call",
        db
    )
    
    if not chat_template or not call_template:
        logger.error("Failed to create templates")
        return
    
    # Create trainers
    trainer_ids = []
    for personality_type in TRAINER_TYPES.keys():
        trainer_id = create_trainer(personality_type, db)
        if trainer_id:
            trainer_ids.append(trainer_id)
    
    if len(trainer_ids) != len(TRAINER_TYPES):
        logger.error("Failed to create all trainers")
        return
    
    # Generate completed trainings
    for trainer_id in trainer_ids:
        for template_id in [chat_template, call_template]:
            for _ in range(5):
                if not generate_completed_training(trainer_id, template_id, db):
                    logger.error(f"Failed to generate training for trainer {trainer_id}")

    logger.info("Data generation completed successfully")

if __name__ == "__main__":
    main() 