#!/bin/sh
set -e

# Create necessary directories
mkdir -p /app/database/data /app/logs

# Start MongoDB with optimized settings for NAS
echo "Starting MongoDB..."
if ! mongod --dbpath /app/database/data \
            --logpath /app/logs/mongodb.log \
            --bind_ip 127.0.0.1 \
            --port 27017 \
            --fork \
            --wiredTigerCacheSizeGB 0.25 \
            --syncdelay 300 \
            --directoryperdb \
            --wiredTigerDirectoryForIndexes \
            --nojournal; then
    echo "MongoDB failed to start. Last few lines of log:"
    tail -n 20 /app/logs/mongodb.log
    exit 1
fi

# Simple wait for MongoDB
echo "Waiting for MongoDB to start..."
sleep 5

# Start Node.js server
exec node src/app.js 