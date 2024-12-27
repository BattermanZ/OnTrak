#!/bin/bash

# Create necessary directories if they don't exist
mkdir -p database/data
mkdir -p logs

# Start MongoDB with the specified data directory
mongod --dbpath database/data --logpath logs/mongodb.log 