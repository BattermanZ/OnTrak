#!/bin/sh
set -e

# Create necessary directories
mkdir -p /app/database/data /app/logs

# Set proper permissions
chown -R mongodb:mongodb /app/database/data /app/logs

# Start MongoDB with more stable configuration
mongod --dbpath /app/database/data \
       --logpath /app/logs/mongodb.log \
       --bind_ip 127.0.0.1 \
       --port 27017 \
       --fork \
       --smallfiles \
       --journal \
       --logappend \
       --wiredTigerCacheSizeGB 0.25

# Wait for MongoDB to be ready with better error handling
echo "Waiting for MongoDB to start..."
timeout=30
while ! mongosh --quiet --eval "db.adminCommand('ping')" > /dev/null 2>&1; do
    if [ -f /app/logs/mongodb.log ]; then
        tail -n 5 /app/logs/mongodb.log
    fi
    timeout=$((timeout - 1))
    if [ $timeout -le 0 ]; then
        echo "Timed out waiting for MongoDB to start"
        if [ -f /app/logs/mongodb.log ]; then
            echo "Last MongoDB logs:"
            tail -n 20 /app/logs/mongodb.log
        fi
        exit 1
    fi
    sleep 1
done
echo "MongoDB started successfully"

# Start Node.js server
cd /app/server && exec node src/app.js 