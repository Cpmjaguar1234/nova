#!/bin/bash

# Check if PID file exists
if [ -f "app.pid" ]; then
    # Read the PID from file
    PID=$(cat app.pid)
    
    # Check if process is still running
    if ps -p $PID > /dev/null; then
        # Kill the process
        kill $PID
        echo "Application stopped."
    else
        echo "Application is not running."
    fi
    
    # Remove the PID file
    rm app.pid
else
    echo "PID file not found. Application may not be running."
fi