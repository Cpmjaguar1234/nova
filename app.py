from flask import Flask, request, jsonify, render_template, redirect, session
from flask_cors import CORS
# import google.generativeai as genai # Removed: No longer using Gemini library
import os
import re
from datetime import timedelta
import json
import bcrypt
from functools import wraps
# import pytesseract # Removed: Not used in the provided code snippet
from PIL import Image
import io
import base64
import requests # Added: To make HTTP requests to OpenRouter API

app = Flask(__name__)
# Add bigideasmath.com to the allowed origins for /ask and /data
CORS(app, resources={
    r"/ask": {"origins": ["https://portal.achieve3000.com", "https://www.deltamath.com", "https://www.bigideasmath.com", "https://www.ixl.com"]}, # Added ixl.com
    r"/set_article": {"origins": "https://portal.achieve3000.com"},
    r"/data": {"origins": ["https://portal.achieve3000.com", "https://www.bigideasmath.com"]}
})

# Configure session
app.secret_key = os.getenv('SECRET_KEY') or os.urandom(24)
app.permanent_session_lifetime = timedelta(minutes=30)

# Initialize password hash from environment variable
PASSWORD = os.getenv('APP_PASSWORD')
if not PASSWORD:
    # Log an error or raise an exception if the password is not set
    # For now, raising an error as in the original code
    raise ValueError("APP_PASSWORD is not set in environment variables.")

SALT = bcrypt.gensalt(rounds=12)
HASHED_PASSWORD = bcrypt.hashpw(PASSWORD.encode('utf-8'), SALT)

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get('Authorization')
        if not auth or not check_auth(auth):
            return jsonify({'error': 'Unauthorized access'}), 401
        return f(*args, **kwargs)
    return decorated

def check_auth(auth_header):
    try:
        if not auth_header.startswith('Bearer '):
            return False
        password = auth_header.split(' ')[1]
        # Using compare_digest for constant-time comparison to mitigate timing attacks
        return bcrypt.checkpw(password.encode('utf-8'), HASHED_PASSWORD)
    except Exception:
        # Log the exception for debugging in a real application
        return False

# Securely load the OpenRouter API key from an environment variable
openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
if not openrouter_api_key:
    raise ValueError("OPENROUTER_API_KEY is not set in environment variables.")

# Define the OpenRouter API endpoint
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

# Define the model to use from OpenRouter (you can change this)
# See OpenRouter documentation for available models: https://openrouter.ai/docs#models
OPENROUTER_MODEL = "openai/gpt-4o-mini" # Example model, choose one that supports multimodal if needed

# Middleware to redirect to the specified URL unless on an endpoint
@app.before_request
def redirect_to_nova():
    # Define the list of allowed endpoints
    allowed_endpoints = ['ask_gemini', 'ask_status', 'toggle_ask', 'handle_data', 'clear_data', 'static']
    # Check if the current endpoint is in the allowed list
    if request.endpoint not in allowed_endpoints:
        # Redirect to the specified URL
        return redirect("https://cpmjaguar1234.github.io/nova")
    # If the endpoint is allowed, continue with the request
    pass


ask_enabled = True  # Global variable to track the state of the /ask endpoint

@app.route('/ask-status', methods=['GET'])
def ask_status():
    return jsonify({'enabled': ask_enabled}), 200

@app.route('/toggle-ask', methods=['POST'])
def toggle_ask():
    global ask_enabled
    try:
        data = request.get_json()
        # Ensure the 'enabled' key is a boolean
        ask_enabled = bool(data.get('enabled', True))
        app.logger.info(f'Ask endpoint toggled to {"enabled" if ask_enabled else "disabled"}.')
        return jsonify({'message': f'Ask endpoint {"enabled" if ask_enabled else "disabled"} successfully.'}), 200
    except Exception as e:
        app.logger.error(f'Error toggling ask endpoint: {str(e)}')
        return jsonify({'error': str(e)}), 500

@app.route('/ask', methods=['GET', 'POST'])
def ask_gemini(): # Renamed from ask_gemini to be more general, but keeping the route name for compatibility
    if not ask_enabled:
        app.logger.warning('Attempted access to disabled /ask endpoint.')
        return jsonify({'error': 'Ask endpoint is currently disabled.'}), 403

    app.logger.info(f"Received {request.method} request at /ask")

    if request.method == 'POST':
        data = request.get_json()
        app.logger.info(f"POST data received.") # Avoid logging sensitive data directly

        # Get the prompt from the request data, regardless of input type
        # Use a default prompt if none is provided in the request
        prompt = data.get('prompt', "Given the input, provide the final answer(s) only. Do not include steps or explanations. If there are multiple answers, separate them with a comma.")
        app.logger.info(f"Using prompt: {prompt}")

        messages = [] # List to hold messages for the chat completion API

        # Handle HTML input from extension
        if 'html' in data:
            html_content = data['html']
            # For HTML input, treat it as text content for the AI
            messages.append({"role": "user", "content": f"Analyze the following HTML:\n\n{html_content}\n\nBased on this, {prompt}"})
            app.logger.info("Processing HTML input.")

        # Handle image input
        elif 'image' in data:
            try:
                # Decode base64 image
                image_data = data['image']
                # Check if the image data is a valid base64 string
                if not isinstance(image_data, str) or not image_data:
                    app.logger.error("Invalid or empty image data received.")
                    return jsonify({'error': 'Invalid or empty image data provided'}), 400

                # OpenRouter's API expects image data as a base64 URL
                # We need to prepend the data URL scheme
                image_url = f"data:image/png;base64,{image_data}" # Assuming PNG format

                # Create multimodal content for the message
                content = [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": image_url}}
                ]
                messages.append({"role": "user", "content": content})
                app.logger.info("Processing image input.")

            except Exception as e:
                app.logger.error(f"Error preparing image data: {str(e)}")
                return jsonify({'error': 'Error preparing image data'}), 500

        # Handle text input (if not HTML or image)
        elif 'q' in data:
             user_input = data['q']
             messages.append({"role": "user", "content": f"{user_input}\n\n{prompt}"})
             app.logger.info("Processing text input.")

        else:
            app.logger.warning('No valid data (html, image, or q) provided in POST request.')
            return jsonify({'error': 'No valid data provided'}), 400

        # If this is a question and we have stored article content, combine them
        # This part is primarily for text-only inputs or if article context is needed with multimodal
        # We should add the article content as a preceding system or user message for context
        if session.get('article_content') and messages:
             # Add article content as a user message before the main query
             # This provides context to the AI
             messages.insert(0, {"role": "user", "content": f"Reference material:\n\n{session['article_content']}"})
             app.logger.info("Prepended article content from session.")


        # Prepare the request payload for OpenRouter
        openrouter_payload = {
            "model": OPENROUTER_MODEL,
            "messages": messages,
            # Add other parameters if needed, e.g., "temperature": 0.7
        }

        try:
            # Make the request to the OpenRouter API
            headers = {
                "Authorization": f"Bearer {openrouter_api_key}",
                "Content-Type": "application/json",
                # Optional: Add X-Title header for analytics
                "X-Title": "Nova IXL Extension Backend"
            }
            app.logger.info(f"Sending request to OpenRouter API URL: {OPENROUTER_API_URL}")
            openrouter_response = requests.post(OPENROUTER_API_URL, headers=headers, json=openrouter_payload)
            app.logger.info(f"OpenRouter API response status: {openrouter_response.status_code}")

            # Check if the request was successful
            openrouter_response.raise_for_status() # Raise an HTTPError for bad responses (4xx or 5xx)

            # Parse the JSON response
            openrouter_data = openrouter_response.json()

            # Extract the response text
            # The structure is usually data['choices'][0]['message']['content']
            if openrouter_data and 'choices' in openrouter_data and len(openrouter_data['choices']) > 0 and 'message' in openrouter_data['choices'][0] and 'content' in openrouter_data['choices'][0]['message']:
                raw_response = openrouter_data['choices'][0]['message']['content']
                # Clean up the response (remove extra whitespace)
                cleaned_response = re.sub(r'\s+', ' ', raw_response).strip()
                app.logger.info(f"Generated response from OpenRouter: {cleaned_response}")
                return jsonify({'response': cleaned_response})
            else:
                app.logger.error(f"Unexpected response format from OpenRouter API: {openrouter_data}")
                return jsonify({'error': 'Unexpected response format from AI API'}), 500

        except requests.exceptions.RequestException as e:
            app.logger.error(f"Error calling OpenRouter API: {str(e)}")
            return jsonify({'error': f'Error communicating with AI API: {str(e)}'}), 500
        except Exception as e:
            app.logger.error(f"An unexpected error occurred during AI processing: {str(e)}")
            return jsonify({'error': f'Internal server error during AI processing: {str(e)}'}), 500


    else: # Handle GET requests - assuming text input via 'q'
        user_input = request.args.get('q')
        # For GET requests, use a default prompt or modify as needed
        prompt = request.args.get('prompt', "Given the input, provide the final answer(s) only. Do not include steps or explanations. If there are multiple answers, separate them with a comma.")
        app.logger.info(f"GET query parameter: {user_input}")

        if not user_input:
            app.logger.warning('No query parameter provided in GET request')
            return jsonify({'error': 'No query parameter provided'}), 400

        messages = [{"role": "user", "content": f"{user_input}\n\n{prompt}"}]

        # If we have stored article content, add it as context
        if session.get('article_content'):
             messages.insert(0, {"role": "user", "content": f"Reference material:\n\n{session['article_content']}"})
             app.logger.info("Prepended article content from session for GET request.")

        # Prepare the request payload for OpenRouter
        openrouter_payload = {
            "model": OPENROUTER_MODEL,
            "messages": messages,
            # Add other parameters if needed
        }

        try:
            # Make the request to the OpenRouter API
            headers = {
                "Authorization": f"Bearer {openrouter_api_key}",
                "Content-Type": "application/json",
                "X-Title": "Nova IXL Extension Backend"
            }
            app.logger.info(f"Sending request to OpenRouter API URL: {OPENROUTER_API_URL}")
            openrouter_response = requests.post(OPENROUTER_API_URL, headers=headers, json=openrouter_payload)
            app.logger.info(f"OpenRouter API response status: {openrouter_response.status_code}")

            openrouter_response.raise_for_status() # Raise an HTTPError for bad responses

            openrouter_data = openrouter_response.json()

            if openrouter_data and 'choices' in openrouter_data and len(openrouter_data['choices']) > 0 and 'message' in openrouter_data['choices'][0] and 'content' in openrouter_data['choices'][0]['message']:
                raw_response = openrouter_data['choices'][0]['message']['content']
                cleaned_response = re.sub(r'\s+', ' ', raw_response).strip()
                app.logger.info(f"Generated response from OpenRouter (GET): {cleaned_response}")
                return jsonify({'response': cleaned_response})
            else:
                app.logger.error(f"Unexpected response format from OpenRouter API (GET): {openrouter_data}")
                return jsonify({'error': 'Unexpected response format from AI API'}), 500

        except requests.exceptions.RequestException as e:
            app.logger.error(f"Error calling OpenRouter API (GET): {str(e)}")
            return jsonify({'error': f'Error communicating with AI API: {str(e)}'}), 500
        except Exception as e:
            app.logger.error(f"An unexpected error occurred during AI processing (GET): {str(e)}")
            return jsonify({'error': f'Internal server error during AI processing: {str(e)}'}), 500


@app.route('/data', methods=['GET', 'POST'])
def handle_data():
    data_file = 'data.json'
    app.logger.info(f"Data endpoint called with {request.method} method")

    # Ensure the data file exists
    if not os.path.exists(data_file):
        try:
            with open(data_file, 'w') as f:
                json.dump([], f)
            app.logger.info(f"Created empty {data_file}.")
        except IOError as e:
            app.logger.error(f"Error creating data file {data_file}: {str(e)}")
            return jsonify({'error': f'Server error: Could not create data file: {str(e)}'}), 500


    # For GET requests, require authentication
    if request.method == 'GET':
        auth = request.authorization
        # Using compare_digest for constant-time comparison
        if not auth or not bcrypt.checkpw(auth.password.encode('utf-8'), HASHED_PASSWORD):
            app.logger.warning("Unauthorized access attempt to /data.")
            return jsonify({'error': 'Unauthorized access'}), 401, {'WWW-Authenticate': 'Basic realm="Login Required"'}

        # GET method to retrieve and display data
        try:
            with open(data_file, 'r') as f:
                data = json.load(f)
            # Assuming you have a 'data.html' template for displaying this
            return render_template('data.html', data=data)
        except FileNotFoundError:
             app.logger.error(f"Data file not found during GET request: {data_file}")
             return jsonify({'error': 'Data file not found.'}), 404
        except json.JSONDecodeError:
             app.logger.error(f"Error decoding JSON from data file: {data_file}")
             return jsonify({'error': 'Error reading data file.'}), 500
        except Exception as e:
            app.logger.error(f'Error reading data: {str(e)}')
            return jsonify({'error': str(e)}), 500

    if request.method == 'POST':
        try:
            if not request.is_json:
                app.logger.error('Request content type is not application/json for /data POST.')
                return jsonify({'error': 'Content-Type must be application/json'}), 400

            data = request.get_json()
            if 'text' not in data:
                app.logger.error('No text provided in request for /data POST.')
                return jsonify({'error': 'Text data is required'}), 400

            # Read existing data
            try:
                with open(data_file, 'r') as f:
                    existing_data = json.load(f)
            except FileNotFoundError:
                 app.logger.warning(f"Data file not found during POST data read, creating new: {data_file}")
                 existing_data = [] # Start with empty list if file not found
            except json.JSONDecodeError:
                 app.logger.error(f"Error decoding JSON from data file during POST: {data_file}")
                 return jsonify({'error': 'Error reading data file.'}), 500


            # Append new data
            existing_data.append(data['text'])
            app.logger.info(f"Appended new data item. Total items: {len(existing_data)}")

            # Write back to file
            with open(data_file, 'w') as f:
                json.dump(existing_data, f, indent=2)

            app.logger.info('Data successfully added to data.json')
            return jsonify({'success': True, 'message': 'Data added successfully'})

        except Exception as e:
            app.logger.error(f"Error processing data POST request: {str(e)}")
            return jsonify({'error': str(e)}), 500

@app.route('/clear-data', methods=['POST'])
def clear_data():
    # Authentication check for clearing data
    auth = request.authorization
    if not auth or not bcrypt.checkpw(auth.password.encode('utf-8'), HASHED_PASSWORD):
        app.logger.warning("Unauthorized access attempt to /clear-data.")
        return jsonify({'error': 'Unauthorized access'}), 401, {'WWW-Authenticate': 'Basic realm="Login Required"'}

    try:
        data_file_path = os.path.join(os.getcwd(), 'data.json')
        # Check if file exists before clearing, prevents errors if it's already gone
        if os.path.exists(data_file_path):
            with open(data_file_path, 'w') as data_file:
                data_file.write('[]')  # Clear the data by writing an empty array
            app.logger.info('Data cleared successfully.')
            return jsonify({'message': 'Data cleared successfully.'}), 200
        else:
            app.logger.warning('Attempted to clear data.json, but file did not exist.')
            return jsonify({'message': 'Data file did not exist, no action needed.'}), 200 # Or 404 if you prefer

    except IOError as e:
        app.logger.error(f'Error clearing data: {str(e)}')
        return jsonify({'error': f'Server error: Could not clear data file: {str(e)}'}), 500
    except Exception as e:
        app.logger.error(f'An unexpected error occurred while clearing data: {str(e)}')
        return jsonify({'error': f'Internal server error while clearing data: {str(e)}'}), 500


# Removed the ask_gemini_internal function as it's no longer used


if __name__ == '__main__':
    # In a production environment, you would use a more robust server like Gunicorn or uWSGI
    # app.run(host='0.0.0.0', port=5000, debug=False) # Set debug=False for production
    app.run(host='0.0.0.0', port=5000, debug=True) # Keep debug=True for development/testing
