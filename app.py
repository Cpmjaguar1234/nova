import os
import re
import json
import io
import base64
from datetime import timedelta
from functools import wraps

import bcrypt
import google.generativeai as genai
from flask import Flask, request, jsonify, render_template, redirect, session, Response # Added Response
from flask_cors import CORS
# You mentioned pytesseract and PIL but they are not used in the provided routes.
# If you plan to use them for OCR, ensure Tesseract is installed and path is configured.
# import pytesseract # Not used in this version, kept for reference if needed
from PIL import Image # Only used for Image.open, Image.thumbnail, Image.convert, Image.save

app = Flask(__name__)

# --- Configuration Constants ---
# Define default values or ensure environment variables are set
DATA_FILE = 'data.json'
DEFAULT_PROMPT_ASK = "Given the input, provide the final answer(s) only. Do not include steps or explanations. If there are multiple answers, separate them with a comma."
DEFAULT_PROMPT_IXL = "Given this IXL math problem, provide the final answer(s) only. Format your response clearly and concisely. If there are multiple answers, separate them with a comma."

# --- Environment Variable Loading & Validation ---
app.secret_key = os.getenv('SECRET_KEY')
if not app.secret_key:
    # Use os.urandom for a strong default if SECRET_KEY is not set in env
    app.secret_key = os.urandom(24)
    app.logger.warning("SECRET_KEY environment variable not set. Using a randomly generated key for this session. Set SECRET_KEY for production.")

APP_PASSWORD_RAW = os.getenv('APP_PASSWORD')
if not APP_PASSWORD_RAW:
    # Use a more specific exception for critical startup failures
    raise ValueError("APP_PASSWORD environment variable is not set. Cannot start without authentication password.")

# Generate SALT only once if not already set or for consistent hashing
# For production, it's safer to store the HASHED_PASSWORD directly as an environment variable
# if you want to avoid re-hashing on every startup, or use a secure secret management system.
SALT = bcrypt.gensalt(rounds=12) # Generate a new salt each time for increased security if hashing raw password
HASHED_PASSWORD = bcrypt.hashpw(APP_PASSWORD_RAW.encode('utf-8'), SALT)

GEMINI_API_KEYS = [key.strip() for key in os.getenv('GEMINI_API_KEYS', '').split(',') if key.strip()]
if not GEMINI_API_KEYS:
    raise ValueError("GEMINI_API_KEYS environment variable is not set. Please provide a comma-separated list of keys.")

current_key_index = 0

def get_next_gemini_key():
    global current_key_index
    key = GEMINI_API_KEYS[current_key_index]
    current_key_index = (current_key_index + 1) % len(GEMINI_API_KEYS)
    return key

# --- Gemini Model Configuration ---
try:
    genai.configure(api_key=get_next_gemini_key())
    model = genai.GenerativeModel('gemini-2.0-flash-exp')
    app.logger.info("Gemini model configured successfully.")
except Exception as e:
    app.logger.error(f"Failed to configure Gemini model: {e}")
    # Consider raising an exception here to prevent the app from starting if AI is critical
    raise RuntimeError(f"Gemini API configuration failed: {e}")

# --- CORS Configuration ---
# Be as specific as possible with origins in production.
# `*` is acceptable for development but less secure for public-facing apps.
CORS(app, resources={
    r"/ask": {
        "origins": "*",  # Specify actual frontend origins here in production
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    },
    r"/ask-ixl": {
        "origins": "*",  # Specify actual frontend origins here in production
        "methods": ["POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    },
    r"/set_article": {"origins": "https://portal.achieve3000.com"},
    # Changed to a list to include multiple origins, good practice.
    # For '/data', we'll allow specific origins for POST, as requested
    r"/data": {
        "origins": ["https://portal.achieve3000.com", "https://www.bigideasmath.com", "http://localhost:5000", "*"], # Added "*" for POST if 'any domain' means CORS
        "methods": ["GET", "POST", "OPTIONS"], # Explicitly allow POST
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

# --- Session Configuration ---
app.permanent_session_lifetime = timedelta(minutes=30)

# --- Authentication Decorator (Bearer Token) ---
def require_auth(f):
    """
    Decorator to enforce basic authentication via Authorization header.
    Expects 'Bearer <password>' where password is the raw APP_PASSWORD.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            app.logger.warning("Unauthorized access attempt: Missing or malformed Authorization header.")
            return jsonify({'error': 'Unauthorized access: Missing or malformed token'}), 401

        try:
            password = auth_header.split(' ')[1]
            # Compare the provided password with the hashed one
            if not bcrypt.checkpw(password.encode('utf-8'), HASHED_PASSWORD):
                app.logger.warning("Unauthorized access attempt: Incorrect password.")
                return jsonify({'error': 'Unauthorized access: Invalid credentials'}), 401
        except IndexError:
            app.logger.warning("Unauthorized access attempt: Bearer token format error.")
            return jsonify({'error': 'Unauthorized access: Invalid token format'}), 401
        except Exception as e:
            app.logger.error(f"Authentication error: {e}", exc_info=True)
            return jsonify({'error': 'Authentication failed due to server error'}), 500

        return f(*args, **kwargs)
    return decorated_function

# --- Authentication Decorator (HTTP Basic Auth for browser prompt) ---
def require_auth_basic(f):
    """
    Decorator to enforce HTTP Basic Authentication, triggering a browser prompt.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth = request.authorization
        # Added check for auth.password to ensure it's not None before encoding
        if not auth or not auth.password or not bcrypt.checkpw(auth.password.encode('utf-8'), HASHED_PASSWORD):
            app.logger.warning("Basic Auth attempt failed or missing/invalid credentials.")
            # Request authentication
            from flask import Response # Import Response locally to avoid circular import if needed elsewhere
            return Response(
                'Could not verify your access level for that URL.\n'
                'You have to login with proper credentials', 401,
                {'WWW-Authenticate': 'Basic realm="Login Required"'}
            )
        return f(*args, **kwargs)
    return decorated_function


# --- Global Flags ---
ask_enabled = True  # Global variable to track the state of the /ask and /ask-ixl endpoints

# --- Middleware (Careful with Global Redirects) ---
@app.before_request
def redirect_to_nova():
    """
    Redirects to the Nova dashboard unless the request is for a defined endpoint.
    This can be overly aggressive; consider if static files or other paths
    are correctly served under this logic.
    """
    # Exclude specific known endpoints and static files from redirection
    # Updated endpoint names after splitting /data route
    if request.endpoint in ['static', 'ask_gemini', 'ask_ixl', 'ask_status', 'toggle_ask', 'get_data_dashboard', 'post_data_entry', 'clear_data', 'set_article']:
        return None # Do not redirect

    # Also check if it's a specific path that should not redirect, e.g., root "/"
    if request.path == '/':
        # You might want to serve a landing page or just let Flask handle 404 for root
        # For now, it redirects to the external dashboard
        pass # Allow the request to proceed to potentially be handled by Flask's routing (e.g. a 404)
    else:
        app.logger.info(f"Redirecting unauthorized path '{request.path}' to Nova dashboard.")
        return redirect("https://cpmjaguar1234.github.io/nova")


# --- Routes ---

@app.route('/ask-status', methods=['GET'])
def ask_status():
    """Returns the current enabled status of the /ask and /ask-ixl endpoints."""
    return jsonify({'enabled': ask_enabled}), 200

@app.route('/toggle-ask', methods=['POST'])
def toggle_ask():
    """Toggles the enabled status of the /ask and /ask-ixl endpoints."""
    global ask_enabled
    try:
        data = request.get_json(silent=True) # Use silent=True for robustness
        if not data or 'enabled' not in data:
            app.logger.warning("Invalid request to /toggle-ask: Missing 'enabled' field or invalid JSON.")
            return jsonify({'error': "Invalid request: 'enabled' field is required in JSON body."}), 400

        ask_enabled = bool(data['enabled'])
        app.logger.info(f'Ask endpoint {"enabled" if ask_enabled else "disabled"} by request.')
        return jsonify({'message': f'Ask endpoint {"enabled" if ask_enabled else "disabled"} successfully.'}), 200
    except Exception as e:
        app.logger.error(f'Error toggling ask endpoint: {e}', exc_info=True) # exc_info for traceback
        return jsonify({'error': f'Server error: {e}'}), 500

@app.route('/ask', methods=['GET', 'POST'])
def ask_gemini():
    """
    Handles requests to the Gemini model, supporting text, HTML, and image inputs.
    Combines inputs with a default or custom prompt.
    """
    if not ask_enabled:
        app.logger.warning("Access denied to /ask: Endpoint is currently disabled.")
        return jsonify({'error': 'Ask endpoint is currently disabled.'}), 403

    app.logger.info(f"Received {request.method} request at /ask")

    user_input = None
    prompt = DEFAULT_PROMPT_ASK
    multimodal_prompt_parts = None # Initialize for image input

    if request.method == 'POST':
        try:
            data = request.get_json(silent=True) # silent=True prevents immediate error for non-JSON
            if not data:
                app.logger.warning("POST request to /ask received non-JSON or empty data.")
                return jsonify({'error': 'Invalid JSON or empty request body. Expected JSON.'}), 400
            app.logger.info(f"POST data keys: {data.keys()}")

            # Use the prompt from data if provided, otherwise fallback to default
            prompt = data.get('prompt', DEFAULT_PROMPT_ASK)

            if 'html' in data:
                html_content = data['html']
                user_input = f"{html_content}\n\n{prompt}"
                app.logger.info("Processing HTML input.")
            elif 'image' in data:
                app.logger.info("Processing image input.")
                try:
                    image_data = base64.b64decode(data['image'])
                    image = Image.open(io.BytesIO(image_data))

                    # Resize image for better performance/API limits
                    max_dimension = 1024
                    if image.width > max_dimension or image.height > max_dimension:
                        # Use Image.LANCZOS for high-quality downsampling
                        image.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
                        app.logger.info(f"Resized image to {image.size}")

                    # Ensure image is in RGB for PNG saving compatibility
                    if image.mode not in ['RGB', 'L']: # L for grayscale, also common.
                        image = image.convert('RGB')

                    image_bytes = io.BytesIO()
                    image.save(image_bytes, format='PNG')
                    image_bytes = image_bytes.getvalue()

                    multimodal_prompt_parts = [
                        {"mime_type": "image/png", "data": image_bytes},
                        prompt # The prompt is directly part of the multimodal input
                    ]
                    
                    # For image input, we directly generate content and return
                    response = model.generate_content(multimodal_prompt_parts)
                    return _handle_gemini_response(response, "image")

                except Exception as e:
                    app.logger.error(f"Error processing image for /ask: {e}", exc_info=True)
                    return jsonify({'error': f'Error processing image: {e}'}), 500
            elif 'q' in data: # Handle generic text input
                user_input = data['q']
                app.logger.info("Processing text input from 'q'.")
                # If article content is in session, prepend it
                if session.get('article_content'):
                    app.logger.info("Prepending article content from session to text input.")
                    user_input = f"{session['article_content']}\n\n{user_input}"
                user_input = f"{user_input}\n\n{prompt}"
            else:
                app.logger.warning("No recognized input type ('html', 'image', 'q') in POST request to /ask.")
                return jsonify({'error': "No recognized input type (html, image, or q) provided in POST request."}), 400

        except Exception as e:
            app.logger.error(f"Error during POST request parsing for /ask: {e}", exc_info=True)
            return jsonify({'error': f'Invalid request data: {e}'}), 400
    else: # Handle GET requests
        user_input = request.args.get('q')
        prompt = request.args.get('prompt', DEFAULT_PROMPT_ASK)
        app.logger.info(f"GET query parameter: {user_input if user_input else 'None'}")

        if not user_input:
            app.logger.warning('No query parameter "q" provided for GET request to /ask.')
            return jsonify({'error': 'No query parameter "q" provided for GET request.'}), 400
        
        # If article content is in session, prepend it for GET requests too
        if session.get('article_content'):
            app.logger.info("Prepending article content from session to GET text input.")
            user_input = f"{session['article_content']}\n\n{user_input}"
        user_input = f"{user_input}\n\n{prompt}"

    # Common generation block for text/html inputs
    # This block is reached if the request was GET or a POST with 'html' or 'q'
    if multimodal_prompt_parts is None: # Only proceed if it's not an image request (which already returned)
        # Ensure user_input is a string and not empty/whitespace only
        if not isinstance(user_input, str):
            app.logger.error(f"User input is not a string. Type: {type(user_input)}. Value: {user_input}")
            return jsonify({'error': 'Invalid input type provided for AI generation.'}), 400

        if not user_input.strip(): # Check if it's empty or just whitespace
            app.logger.warning("User input is empty or contains only whitespace after processing.")
            return jsonify({'error': 'No meaningful query content provided for AI generation.'}), 400

        try:
            app.logger.info(f"Sending request to Gemini with prompt length: {len(user_input)} characters.")
            retries = 0
            max_retries = len(GEMINI_API_KEYS) # Try each key once
            while retries < max_retries:
                try:
                    # Re-initialize model with new key for each attempt
                    new_key = get_next_gemini_key()
                    genai.configure(api_key=new_key)
                    model = genai.GenerativeModel('gemini-2.0-flash-exp') # Re-initialize model with new key
                    app.logger.info(f"Attempting with new Gemini API key: {new_key[:5]}...")
                    response = model.generate_content(user_input)
                    return _handle_gemini_response(response, "text/html")
                except (genai.types.BlockedPromptException, genai.types.StopCandidateException) as e:
                    app.logger.warning(f"Gemini API error (attempt {retries + 1}/{max_retries}): {e}")
                    retries += 1
                    if retries >= max_retries:
                        app.logger.error(f"All Gemini API keys failed after {max_retries} attempts.")
                        return jsonify({'error': 'All available AI keys failed or request was blocked due to safety concerns or content policy violation.'}), 500
                except Exception as e:
                    app.logger.error(f"Error during Gemini content generation for /ask: {e}", exc_info=True)
                    retries += 1
                    if retries >= max_retries:
                        app.logger.error(f"All Gemini API keys failed after {max_retries} attempts.")
                        return jsonify({'error': f'Error generating response from AI after {max_retries} attempts: {e}'}), 500
                    return jsonify({'error': f'Error generating response from AI: {e}'}), 500
        except Exception as e:
            app.logger.error(f"Error during Gemini content generation for /ask: {e}", exc_info=True)
            return jsonify({'error': f'Error generating response from AI: {e}'}), 500
    # If multimodal_prompt_parts was not None, it means it was an image request and already returned.
    # This final line ensures that if for some unexpected reason the function reaches here
    # without returning, it will explicitly return an error.
    app.logger.error("Reached end of /ask without a valid return statement in an unexpected path.")
    return jsonify({'error': 'An unexpected server error occurred. No response generated.'}), 500


def _handle_gemini_response(response, input_type="unknown"):
    """Helper function to process Gemini's response."""
    if response and hasattr(response, 'text'):
        cleaned_response = re.sub(r'\s+', ' ', response.text).strip()
        app.logger.info(f"Generated response for {input_type}: {cleaned_response[:100]}...") # Log first 100 chars
        return jsonify({'response': cleaned_response})
    else:
        app.logger.error(f'Failed to generate a valid response for {input_type}. Response object: {response}')
        return jsonify({'error': 'Failed to generate a valid AI response'}), 500


@app.route('/ask-ixl', methods=['POST'])
def ask_ixl():
    """
    Handles IXL specific requests, expecting HTML content and instructions.
    """
    if not ask_enabled:
        app.logger.warning("Access denied to /ask-ixl: Endpoint is currently disabled.")
        return jsonify({'error': 'Ask endpoint is currently disabled.'}), 403

    app.logger.info(f"Received request at /ask-ixl")

    try:
        # Ensure we have at least one except clause
        pass
    except Exception as e:
        app.logger.error(f"Error in /ask-ixl: {e}", exc_info=True)
        return jsonify({'error': f'Error processing IXL request: {e}'}), 500
        data = request.get_json(silent=True) # Use silent=True for robustness
        if not data:
            app.logger.warning("POST request to /ask-ixl received non-JSON or empty data.")
            return jsonify({'error': 'No data provided or invalid JSON'}), 400

        app.logger.info(f"IXL data keys: {data.keys()}")

        html_content = data.get('html', '').strip()
        instructions = data.get('instructions', '').strip()
        prompt = data.get('prompt', DEFAULT_PROMPT_IXL)

        if not html_content:
            app.logger.warning('No HTML content provided for /ask-ixl.')
            return jsonify({'error': 'No HTML content provided for IXL problem'}), 400

        # Combine HTML, instructions, and prompt for Gemini
        user_input_parts = []
        if instructions:
            user_input_parts.append(f"IXL Problem Instructions: {instructions}")
        
        user_input_parts.append(f"HTML Content: {html_content}")
        user_input_parts.append(prompt)
        
        user_input = "\n\n".join(user_input_parts)
        
        app.logger.info(f"Sending IXL request to Gemini with prompt length: {len(user_input)} characters.")
        retries = 0
        max_retries = len(GEMINI_API_KEYS) # Try each key once
        while retries < max_retries:
            try:
                # Re-initialize model with new key for each attempt
                new_key = get_next_gemini_key()
                genai.configure(api_key=new_key)
                model = genai.GenerativeModel('gemini-2.0-flash-exp') # Re-initialize model with new key
                app.logger.info(f"Attempting with new Gemini API key for IXL: {new_key[:5]}...")
                response = model.generate_content(user_input)
                return _handle_gemini_response(response, "IXL problem")
            except (genai.types.BlockedPromptException, genai.types.StopCandidateException) as e:
                app.logger.warning(f"Gemini IXL API error (attempt {retries + 1}/{max_retries}): {e}")
                retries += 1
                if retries >= max_retries:
                    app.logger.error(f"All Gemini API keys failed after {max_retries} attempts.")
                    return jsonify({'error': 'All available AI keys failed or request was blocked due to safety concerns or content policy violation.'}), 500
            except Exception as e:
                app.logger.error(f"Error during Gemini content generation for /ask-ixl: {e}", exc_info=True)
                retries += 1
                if retries >= max_retries:
                    app.logger.error(f"All Gemini API keys failed after {max_retries} attempts.")
                    return jsonify({'error': f'Error generating response from AI after {max_retries} attempts: {e}'}), 500
        return jsonify({'error': f'Error processing IXL request: {e}'}), 500

@app.route('/set_article', methods=['POST'])
@require_auth # Apply authentication if this endpoint needs to be secured
def set_article():
    """
    Stores article content in the session.
    Consider if this should be secured by require_auth.
    """
    try:
        data = request.get_json(silent=True) # Use silent=True for robustness
        if not data or 'article' not in data:
            app.logger.warning("Invalid request to /set_article: Missing 'article' field or invalid JSON.")
            return jsonify({'error': "Invalid request: 'article' field is required in JSON body."}), 400

        session['article_content'] = data['article']
        app.logger.info("Article content stored in session.")
        return jsonify({'success': True, 'message': 'Article content stored successfully.'}), 200
    except Exception as e:
        app.logger.error(f"Error storing article content: {e}", exc_info=True)
        return jsonify({'error': f'Error storing article content: {e}'}), 500

@app.route('/data', methods=['GET'])
@require_auth_basic # Only GET requires password
def get_data_dashboard():
    """
    Handles reading user data for the dashboard. Requires authentication.
    """
    app.logger.info(f"Data endpoint called with GET method.")
    try:
        data = [] # Initialize data as an empty list by default
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r') as f:
                content = f.read().strip()
                if content: # Only try to load if content is not empty
                    try:
                        loaded_data = json.loads(content)
                        if isinstance(loaded_data, list):
                            data = loaded_data
                        else:
                            app.logger.error(f"Data file '{DATA_FILE}' content is not a JSON list. Found type: {type(loaded_data).__name__}. Resetting file.")
                            with open(DATA_FILE, 'w') as f_reset:
                                json.dump([], f_reset)
                    except json.JSONDecodeError as e:
                        app.logger.error(f'Error decoding JSON from {DATA_FILE}: Malformed JSON. {e}. Resetting file.', exc_info=True)
                        with open(DATA_FILE, 'w') as f_reset:
                            json.dump([], f_reset)
                else:
                    app.logger.info(f"Data file '{DATA_FILE}' is empty. Initializing as empty list.")
                    with open(DATA_FILE, 'w') as f_reset:
                        json.dump([], f_reset)
        else:
            app.logger.info(f"Creating empty {DATA_FILE} as it does not exist.")
            with open(DATA_FILE, 'w') as f:
                json.dump([], f)

        # At this point, 'data' is guaranteed to be a list.
        app.logger.info(f"Successfully loaded {len(data)} data entries for GET request.")
        return render_template('data.html', data=data)
    except IOError as e:
        app.logger.error(f'Error accessing {DATA_FILE}: {e}', exc_info=True)
        return jsonify({'error': f'Error accessing data file: {e}'}), 500
    except Exception as e:
        app.logger.error(f'Unexpected error in /data GET: {e}', exc_info=True)
        return jsonify({'error': f'Internal server error: {e}'}), 500

@app.route('/data', methods=['POST'])
# No authentication decorator here, allowing POST requests from any domain.
def post_data_entry():
    """
    Handles adding new data entries. Does NOT require authentication.
    """
    app.logger.info(f"Data endpoint called with POST method (no authentication required).")
    try:
        if not request.is_json:
            app.logger.warning('POST to /data: Request content type is not application/json.')
            return jsonify({'error': 'Content-Type must be application/json'}), 400

        data = request.get_json(silent=True) # Use silent=True for robustness
        if not data or 'text' not in data:
            app.logger.warning('POST to /data: No "text" field or invalid JSON provided.')
            return jsonify({'error': 'Text data is required in JSON body'}), 400

        # Ensure the data file exists and is a list before reading
        if not os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'w') as f:
                json.dump([], f)

        # Read existing data
        with open(DATA_FILE, 'r') as f:
            existing_data = json.load(f)
        
        # Ensure existing_data is a list before appending
        if not isinstance(existing_data, list):
            app.logger.warning(f"Existing data in '{DATA_FILE}' is not a list during POST. Initializing as empty list for append.")
            existing_data = []

        # Prepare new data entry with additional fields
        new_entry = {
            'text': data['text'],
            'timestamp': data.get('timestamp', 'Unknown'), # Use 'Unknown' as default for safety
            'os': data.get('os', 'Unknown'),
            'browser': data.get('browser', 'Unknown')
        }

        app.logger.info(f"Received new data entry: OS: {new_entry['os']}, Browser: {new_entry['browser']}, Text (partial): {new_entry['text'][:50]}...")

        existing_data.append(new_entry)

        # Write back to file with proper indentation
        with open(DATA_FILE, 'w') as f:
            json.dump(existing_data, f, indent=2)

        app.logger.info('Data successfully added to data.json.')
        return jsonify({'success': True, 'message': 'Data added successfully'})

    except json.JSONDecodeError as e:
        app.logger.error(f'Error decoding JSON from {DATA_FILE} during POST: {e}', exc_info=True)
        return jsonify({'error': f'Error reading data file for update: Malformed JSON. {e}'}), 500
    except IOError as e:
        app.logger.error(f'Error writing to {DATA_FILE} during POST: {e}', exc_info=True)
        return jsonify({'error': f'Error writing data to file: {e}'}), 500
    except Exception as e:
        app.logger.error(f"Error processing data POST request: {e}", exc_info=True)
        return jsonify({'error': f'Internal server error: {e}'}), 500

@app.route('/clear-data', methods=['POST'])
@require_auth_basic # Apply authentication for clearing data, as this modifies data
def clear_data():
    """Clears all data from the data.json file."""
    try:
        # Use DATA_FILE constant for consistency
        data_file_path = os.path.join(os.getcwd(), DATA_FILE) # Use DATA_FILE constant
        with open(data_file_path, 'w') as data_file:
            data_file.write('[]')  # Clear the data by writing an empty array
        app.logger.info(f'{DATA_FILE} cleared successfully.')
        return jsonify({'message': 'Data cleared successfully.'}), 200
    except IOError as e:
        app.logger.error(f'Error clearing {DATA_FILE}: {e}', exc_info=True)
        return jsonify({'error': f'Error clearing data file: {e}'}), 500
    except Exception as e:
        app.logger.error(f'Unexpected error clearing data: {e}', exc_info=True)
        return jsonify({'error': f'Internal server error: {e}'}), 500

# Removed ask_gemini_internal as its logic is now directly in ask_gemini

if __name__ == '__main__':
    # Set Flask log level to INFO for more output during local development
    # In production, use a proper WSGI server (Gunicorn, uWSGI) and configure its logging.
    import logging
    logging.basicConfig(level=logging.INFO) # Or logging.DEBUG for more verbosity

    # For development: run on all interfaces, debug mode for detailed errors
    # WARNING: DO NOT USE debug=True IN PRODUCTION!
    app.run(host='0.0.0.0', port=5000, debug=True)
