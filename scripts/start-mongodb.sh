#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Get the project root directory (parent of scripts directory)
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Change to project root directory
cd "$PROJECT_ROOT"

# Stop MongoDB service if running
brew services stop mongodb-community

# Create required directories if they don't exist
mkdir -p database/data database/logs

# Start MongoDB with our configuration in the background
mongod --config database/mongod.conf &

# Save the PID
echo $! > database/mongod.pid

echo "MongoDB started with PID $(cat database/mongod.pid)" 