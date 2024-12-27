#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Get the project root directory (parent of scripts directory)
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Change to project root directory
cd "$PROJECT_ROOT"

# Stop MongoDB service
brew services stop mongodb-community

# If PID file exists, kill the process
if [ -f database/mongod.pid ]; then
    PID=$(cat database/mongod.pid)
    if ps -p $PID > /dev/null; then
        echo "Stopping MongoDB process (PID: $PID)"
        kill $PID
    fi
    rm database/mongod.pid
fi

echo "MongoDB stopped"

# Additional cleanup if needed
# Note: Add any cleanup tasks here if required 