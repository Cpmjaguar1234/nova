#!/bin/bash

# Set environment variables
export APP_PASSWORD='your_password'
export GEMINI_API_KEY='your_api_key'

# Generate a random secret key for Flask sessions
export SECRET_KEY=$(openssl rand -hex 24)

# Start the Flask application
python app.py