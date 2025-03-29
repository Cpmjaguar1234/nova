#!/bin/bash

# Check if Fish shell is being used
if [ "$SHELL" = "/usr/bin/fish" ]; then
    # If using Fish, source the Fish virtual environment activation script
    source venv/bin/activate.fish
else
    # Otherwise, source the default Bash virtual environment activation script
    source venv/bin/activate
fi

# Set environment variables
export APP_PASSWORD='password'
export GEMINI_API_KEY='key'

# Generate a random secret key for Flask sessions
export SECRET_KEY=$(openssl rand -hex 24)

# Start the Flask application in the background with nohup
nohup python app.py > output.log 2>&1 &

# Save the process ID to a file for later use
echo $! > app.pid

echo "Application started in background. Check output.log for logs."
