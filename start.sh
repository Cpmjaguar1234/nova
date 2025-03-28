#!/bin/bash

# Set environment variables
export APP_PASSWORD='your_password'
export GEMINI_API_KEY='your_api_key'

# Generate a random secret key for Flask sessions
export SECRET_KEY=$(openssl rand -hex 24)

# Start the Flask application in background with nohup
nohup python app.py > output.log 2>&1 &

# Save the process ID to a file for later use
echo $! > app.pid

echo "Application started in background. Check output.log for logs."