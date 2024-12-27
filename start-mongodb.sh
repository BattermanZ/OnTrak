#!/bin/bash

# Get the absolute path of the script directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Create data and logs directories if they don't exist
mkdir -p "$DIR/database/data"
mkdir -p "$DIR/database/logs"

# Start MongoDB with the configuration file
mongod --config "$DIR/database/mongod.conf" 