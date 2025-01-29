#!/bin/sh
set -e

# Create directories if they don't exist
mkdir -p /app/database/data /app/logs

echo "Starting MongoDB..."
mongod --dbpath /app/database/data --logpath /app/logs/mongodb.log --bind_ip 127.0.0.1 --fork

# Wait for MongoDB to be ready
echo "Waiting for MongoDB to be ready..."
timeout=30
while ! mongosh --quiet --eval "db.runCommand({ ping: 1 })" > /dev/null 2>&1; do
    timeout=$((timeout - 1))
    if [ $timeout -le 0 ]; then
        echo "Timed out waiting for MongoDB to start"
        exit 1
    fi
    sleep 1
done
echo "MongoDB is ready!"

# Start Node.js server
echo "Starting Node.js server..."
cd /app/server && exec node src/app.js 