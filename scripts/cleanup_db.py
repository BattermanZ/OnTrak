from pymongo import MongoClient

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['ontrak']

# List all collections before cleanup
print("Collections before cleanup:")
collections = db.list_collection_names()
for collection in collections:
    print(f"- {collection}: {db[collection].count_documents({})} documents")

# Drop all collections
for collection in collections:
    db[collection].drop()

print("\nAll collections have been dropped.")

# Verify cleanup
print("\nCollections after cleanup:")
collections = db.list_collection_names()
if not collections:
    print("No collections remaining - cleanup successful!")
else:
    for collection in collections:
        print(f"- {collection}: {db[collection].count_documents({})} documents") 