from pymongo import MongoClient
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['ontrak']

# List all collections before cleanup
logger.info("Collections before cleanup:")
collections = db.list_collection_names()
for collection in collections:
    logger.info(f"- {collection}: {db[collection].count_documents({})} documents")

# Save admin user before cleanup
admin_user = db.users.find_one({"role": "admin"})
if not admin_user:
    logger.warning("No admin user found!")
    
# Drop all collections except users
for collection in collections:
    if collection != 'users':
        logger.info(f"Dropping collection: {collection}")
        db[collection].drop()

# Clear users collection except admin
if admin_user:
    logger.info("Clearing users collection while preserving admin account")
    db.users.delete_many({"role": {"$ne": "admin"}})
else:
    logger.info("Dropping users collection (no admin found)")
    db.users.drop()

# Verify cleanup
logger.info("\nCollections after cleanup:")
collections = db.list_collection_names()
if not collections:
    logger.info("No collections remaining!")
else:
    for collection in collections:
        count = db[collection].count_documents({})
        logger.info(f"- {collection}: {count} documents")
        if collection == 'users':
            admin_count = db.users.count_documents({"role": "admin"})
            logger.info(f"  - Admin users: {admin_count}")

logger.info("\nCleanup completed successfully!") 