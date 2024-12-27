#!/bin/bash

# Stop any running MongoDB instance
mongod --shutdown

# Start MongoDB with our configuration
mongod --config /Users/aurelien/Desktop/coding/ontrak/database/mongod.conf 