#!/bin/sh

# Start MongoDB
mongod --dbpath /app/database/data --logpath /app/logs/mongodb.log --bind_ip 127.0.0.1 --fork

# Wait for MongoDB to start
sleep 5

# Start Node.js server
cd /app/server && node src/app.js 