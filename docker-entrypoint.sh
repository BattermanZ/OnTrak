#!/bin/sh
set -e

# Start MongoDB
mongod --dbpath /app/database/data --logpath /app/logs/mongodb.log --bind_ip 127.0.0.1 --fork

# Wait for MongoDB to be ready
echo "Waiting for MongoDB to start..."
timeout=30
while ! mongosh --quiet --eval "db.adminCommand('ping')" > /dev/null 2>&1; do
    timeout=$((timeout - 1))
    if [ $timeout -le 0 ]; then
        echo "Timed out waiting for MongoDB to start"
        exit 1
    fi
    sleep 1
done
echo "MongoDB started successfully"

# Start Node.js server
cd /app/server && exec node src/app.js 