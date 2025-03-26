#!/usr/bin/env python3
from pymongo import MongoClient
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_schedules():
    try:
        # Connect to MongoDB
        client = MongoClient('mongodb://localhost:27017/')
        db = client.ontrak  # Replace with your database name
        
        # Get all schedules
        schedules = db.schedules.find({})
        
        update_count = 0
        for schedule in schedules:
            # Add actualStartTime and actualEndTime fields to each activity if they don't exist
            modified = False
            for activity in schedule.get('activities', []):
                if 'actualStartTime' not in activity:
                    activity['actualStartTime'] = None
                if 'actualEndTime' not in activity:
                    activity['actualEndTime'] = None
                modified = True
            
            if modified:
                # Update the schedule document
                db.schedules.update_one(
                    {'_id': schedule['_id']},
                    {'$set': {'activities': schedule['activities']}}
                )
                update_count += 1
        
        logger.info(f"Migration completed successfully. Updated {update_count} schedules.")
        
    except Exception as e:
        logger.error(f"Error during migration: {str(e)}")
        raise
    finally:
        client.close()

if __name__ == "__main__":
    logger.info("Starting migration to add actual start and end times to activities...")
    migrate_schedules()
    logger.info("Migration completed.") 