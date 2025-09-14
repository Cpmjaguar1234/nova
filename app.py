import os
import re
import json
import io
import base64
from datetime import timedelta
from functools import wraps

import bcrypt
import google.generativeai as genai
import openai

client = openai.OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=os.environ.get("GROQ_API_KEY")
)
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

    r"/set_article": {"origins": "https://portal.achieve3000.com"},
    # Changed to a list to include multiple origins, good practice.
    # For '/data', we'll allow specific origins for POST, as requested
    r"/data": {
        "origins": ["https://portal.achieve3000.com", "https://www.bigideasmath.com", "http://localhost:5000", "*"], # Added "*" for POST if 'any domain' means CORS
        "methods": ["GET", "POST", "OPTIONS"], # Explicitly allow POST
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    },
    # Add CORS configuration for clear-data endpoint
    r"/clear-data": {
        "origins": ["http://localhost:5000", "*"],
        "methods": ["POST", "OPTIONS"],
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


# --- Helper Functions for Enhanced User Agent Parsing ---
def parse_browser_details(user_agent):
    """Parse detailed browser information from user agent string."""
    browser_details = {
        'name': 'Unknown',
        'version': 'Unknown',
        'engine': 'Unknown',
        'is_mobile': False
    }
    
    try:
        # Brave Browser
        if 'Brave' in user_agent:
            browser_details['name'] = 'Brave'
            browser_details['engine'] = 'Blink'
        # Vivaldi
        elif 'Vivaldi' in user_agent:
            vivaldi_match = re.search(r'Vivaldi/([0-9\.]+)', user_agent)
            browser_details['name'] = 'Vivaldi'
            browser_details['version'] = vivaldi_match.group(1) if vivaldi_match else 'Unknown'
            browser_details['engine'] = 'Blink'
        # Microsoft Edge (Chromium and Legacy)
        elif 'Edg' in user_agent or 'Edge' in user_agent:
            edge_match = re.search(r'Edg?/([0-9\.]+)', user_agent)
            browser_details['name'] = 'Microsoft Edge'
            if edge_match:
                version_num = int(edge_match.group(1).split('.')[0])
                browser_details['version'] = edge_match.group(1)
                browser_details['engine'] = 'Blink' if version_num >= 79 else 'EdgeHTML'
            else:
                browser_details['engine'] = 'EdgeHTML'
        # Opera
        elif 'Opera' in user_agent or 'OPR' in user_agent:
            opera_match = re.search(r'(?:Opera|OPR)/([0-9\.]+)', user_agent)
            browser_details['name'] = 'Opera'
            browser_details['version'] = opera_match.group(1) if opera_match else 'Unknown'
            browser_details['engine'] = 'Blink'
        # Chrome (must come after other Chromium browsers)
        elif 'Chrome' in user_agent and 'Edge' not in user_agent and 'OPR' not in user_agent:
            chrome_match = re.search(r'Chrome/([0-9\.]+)', user_agent)
            browser_details['name'] = 'Google Chrome'
            browser_details['version'] = chrome_match.group(1) if chrome_match else 'Unknown'
            browser_details['engine'] = 'Blink'
        # Firefox
        elif 'Firefox' in user_agent:
            firefox_match = re.search(r'Firefox/([0-9\.]+)', user_agent)
            browser_details['name'] = 'Mozilla Firefox'
            browser_details['version'] = firefox_match.group(1) if firefox_match else 'Unknown'
            browser_details['engine'] = 'Gecko'
        # Safari
        elif 'Safari' in user_agent and 'Chrome' not in user_agent:
            safari_match = re.search(r'Version/([0-9\.]+).*Safari', user_agent)
            browser_details['name'] = 'Apple Safari'
            browser_details['version'] = safari_match.group(1) if safari_match else 'Unknown'
            browser_details['engine'] = 'WebKit'
        # Internet Explorer
        elif 'Trident' in user_agent or 'MSIE' in user_agent:
            ie_match = re.search(r'(?:MSIE |Trident.*rv:)([0-9\.]+)', user_agent)
            browser_details['name'] = 'Internet Explorer'
            browser_details['version'] = ie_match.group(1) if ie_match else 'Unknown'
            browser_details['engine'] = 'Trident'
        # Samsung Internet
        elif 'Samsung' in user_agent:
            browser_details['name'] = 'Samsung Internet'
            browser_details['engine'] = 'Blink'
        # UC Browser
        elif 'UCBrowser' in user_agent:
            uc_match = re.search(r'UCBrowser/([0-9\.]+)', user_agent)
            browser_details['name'] = 'UC Browser'
            browser_details['version'] = uc_match.group(1) if uc_match else 'Unknown'
        # Yandex Browser
        elif 'YaBrowser' in user_agent:
            yandex_match = re.search(r'YaBrowser/([0-9\.]+)', user_agent)
            browser_details['name'] = 'Yandex Browser'
            browser_details['version'] = yandex_match.group(1) if yandex_match else 'Unknown'
            browser_details['engine'] = 'Blink'
        
        # Detect mobile browsers
        browser_details['is_mobile'] = bool(re.search(r'Mobile|Android|iPhone|iPad|iPod', user_agent))
        
    except Exception as e:
        app.logger.error(f"Error parsing browser details: {e}")
    
    return browser_details

def parse_os_details(user_agent):
    """Parse detailed OS information from user agent string."""
    os_details = {
        'name': 'Unknown',
        'version': 'Unknown',
        'architecture': 'Unknown'
    }
    
    try:
        # Windows detection with versions
        if 'Windows NT' in user_agent:
            if 'Windows NT 10.0' in user_agent:
                os_details['name'] = 'Windows'
                os_details['version'] = '10/11'
                if 'WOW64' in user_agent or 'Win64' in user_agent:
                    os_details['architecture'] = '64-bit'
                else:
                    os_details['architecture'] = '32-bit'
            elif 'Windows NT 6.3' in user_agent:
                os_details['name'] = 'Windows'
                os_details['version'] = '8.1'
            elif 'Windows NT 6.2' in user_agent:
                os_details['name'] = 'Windows'
                os_details['version'] = '8'
            elif 'Windows NT 6.1' in user_agent:
                os_details['name'] = 'Windows'
                os_details['version'] = '7'
            else:
                os_details['name'] = 'Windows'
        # macOS detection
        elif 'Mac OS X' in user_agent:
            mac_match = re.search(r'Mac OS X ([0-9_]+)', user_agent)
            os_details['name'] = 'macOS'
            if mac_match:
                version = mac_match.group(1).replace('_', '.')
                major_version = int(version.split('.')[1]) if len(version.split('.')) > 1 else 0
                if major_version >= 15:
                    os_details['version'] = 'Monterey+'
                elif major_version >= 14:
                    os_details['version'] = 'Big Sur'
                elif major_version >= 13:
                    os_details['version'] = 'Catalina+'
                else:
                    os_details['version'] = version
        # Linux distributions
        elif 'Linux' in user_agent:
            os_details['name'] = 'Linux'
            if 'Ubuntu' in user_agent:
                os_details['version'] = 'Ubuntu'
            elif 'Fedora' in user_agent:
                os_details['version'] = 'Fedora'
            elif 'SUSE' in user_agent:
                os_details['version'] = 'SUSE'
            elif 'Red Hat' in user_agent:
                os_details['version'] = 'Red Hat'
        # Android
        elif 'Android' in user_agent:
            android_match = re.search(r'Android ([0-9\.]+)', user_agent)
            os_details['name'] = 'Android'
            os_details['version'] = android_match.group(1) if android_match else 'Unknown'
        # iOS
        elif 'iPhone' in user_agent or 'iPad' in user_agent or 'iPod' in user_agent:
            ios_match = re.search(r'OS ([0-9_]+)', user_agent)
            os_details['name'] = 'iOS'
            if ios_match:
                os_details['version'] = ios_match.group(1).replace('_', '.')
        # Chrome OS
        elif 'CrOS' in user_agent:
            os_details['name'] = 'Chrome OS'
        # BSD variants
        elif 'FreeBSD' in user_agent:
            os_details['name'] = 'FreeBSD'
        elif 'OpenBSD' in user_agent:
            os_details['name'] = 'OpenBSD'
        elif 'NetBSD' in user_agent:
            os_details['name'] = 'NetBSD'
            
    except Exception as e:
        app.logger.error(f"Error parsing OS details: {e}")
    
    return os_details

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
    if request.endpoint in ['static', 'ask_gemini', 'ask_status', 'toggle_ask', 'get_data_dashboard', 'post_data_entry', 'clear_data', 'set_article', 'handle_answers']:
        return None # Do not redirect

    # Also check if it's a specific path that should not redirect, e.g., root "/"
    if request.path == '/':
        # You might want to serve a landing page or just let Flask handle 404 for root
        # For now, it redirects to the external dashboard
        pass # Allow the request to proceed to potentially be handled by Flask's routing (e.g. a 404)
    else:
        # Removed redirect to non-existent GitHub Pages site.
        # If a dashboard is needed, it should be hosted and configured correctly.
        pass


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
                    # For image input, we directly generate content and return
                    # Groq API does not support image input directly in chat completions
                    # For now, we'll return an error for image input.
                    app.logger.error("Groq API does not support image input directly in chat completions.")
                    return jsonify({'error': 'Image input is not supported by the configured Groq API.'}), 400

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

        app.logger.info(f"Sending request to Groq with prompt length: {len(user_input)} characters.")
        try:
            response = client.chat.completions.create(
                messages=[
                    {
                        "role": "user",
                        "content": user_input,
                    }
                ],
                model="gemma2-9b-it", # Using a common Groq model, can be made configurable
            )
            return _handle_groq_response(response, "text/html")
        except Exception as e:
            app.logger.error(f"Error during Groq content generation for /ask: {e}", exc_info=True)
            return jsonify({'error': f'Error generating response from AI: {e}'}), 500
    # If multimodal_prompt_parts was not None, it means it was an image request and already returned.
    # This final line ensures that if for some unexpected reason the function reaches here
    # without returning, it will explicitly return an error.
    app.logger.error("Reached end of /ask without a valid return statement in an unexpected path.")
    return jsonify({'error': 'An unexpected server error occurred. No response generated.'}), 500


def _handle_groq_response(response, input_type="unknown"):
    """Helper function to process Groq's response."""
    if response and response.choices and response.choices[0].message.content:
        cleaned_response = re.sub(r'\s+', ' ', response.choices[0].message.content).strip()
        if cleaned_response:
            app.logger.info(f"Generated response for {input_type}: {cleaned_response[:100]}...") # Log first 100 chars
            return jsonify({'response': cleaned_response})
        else:
            app.logger.error(f'Groq returned empty content for {input_type}. Response object: {response}')
            return jsonify({'error': 'AI service returned empty content'}), 500
    else:
        app.logger.error(f'Failed to generate a valid response for {input_type}. Response object: {response}')
        return jsonify({'error': 'Failed to generate a valid AI response'}), 500


# New constant for answers file
ANSWERS_FILE = 'answers.json'

@app.route('/answers', methods=['GET', 'PUT'])
def handle_answers():
    """Handles getting and updating the answers cache."""
    answers_file = os.path.join(os.getcwd(), ANSWERS_FILE)
    
    if request.method == 'GET':
        if os.path.exists(answers_file):
            with open(answers_file, 'r') as f:
                try:
                    data = json.load(f)
                    return jsonify(data), 200
                except json.JSONDecodeError:
                    app.logger.error(f'Error decoding JSON from {ANSWERS_FILE}.')
                    return jsonify({'error': 'Invalid data format'}), 500
        else:
            # Initialize with default structure if file doesn't exist
            default_data = {"record": {"Homeworks": []}}
            with open(answers_file, 'w') as f:
                json.dump(default_data, f, indent=2)
            return jsonify(default_data), 200
    
    elif request.method == 'PUT':
        data = request.get_json(silent=True) 
        if not data:
            app.logger.warning("Invalid JSON for /answers PUT.")
            return jsonify({'error': 'Invalid JSON'}), 400
        try:
            with open(answers_file, 'w') as f:
                json.dump(data, f, indent=2)
            app.logger.info('Answers data updated successfully.')
            return jsonify({'success': True}), 200
        except Exception as e:
            app.logger.error(f'Error writing to {ANSWERS_FILE}: {e}', exc_info=True)
            return jsonify({'error': f'Error updating data: {e}'}), 500

    app.logger.error("Reached end of /ask without a valid return statement in an unexpected path.")
    return jsonify({'error': 'An unexpected server error occurred. No response generated.'}), 500


def _handle_groq_response(response, input_type="unknown"):
    """Helper function to process Groq's response."""
    if response and response.choices and response.choices[0].message.content:
        cleaned_response = re.sub(r'\s+', ' ', response.choices[0].message.content).strip()
        if cleaned_response:
            app.logger.info(f"Generated response for {input_type}: {cleaned_response[:100]}...") # Log first 100 chars
            return jsonify({'response': cleaned_response})
        else:
            app.logger.error(f'Groq returned empty content for {input_type}. Response object: {response}')
            return jsonify({'error': 'AI service returned empty content'}), 500
    else:
        app.logger.error(f'Failed to generate a valid response for {input_type}. Response object: {response}')
        return jsonify({'error': 'Failed to generate a valid AI response'}), 500






@app.route('/data', methods=['GET'])
@require_auth_basic # Only GET requires password
def get_data_dashboard():
    """
    Renders the data dashboard HTML page.
    """
    app.logger.info("Rendering data.html dashboard.")
    data = []
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            content = f.read().strip()
            if content:
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
    return render_template('data.html', data=data)



@app.route('/data', methods=['POST'])
def post_data_entry():
    try:
        data = request.get_json()
        if not data:
            app.logger.warning("Received empty or invalid JSON for /data POST.")
            return jsonify({'error': 'Invalid JSON'}), 400

        text = data.get('text', 'N/A')
        timestamp = data.get('timestamp', 'N/A')
        os_info = data.get('os', 'N/A')
        browser_info = data.get('browser', 'N/A')
        is_mobile = data.get('isMobile', False)
        mobile_type = data.get('mobileType', 'N/A')
        nova_clicks = data.get('novaClicks', 0) # Get novaClicks, default to 0 if not provided
        
        # Enhanced user agent parsing for better analytics
        user_agent = request.headers.get('User-Agent', 'Unknown')
        
        # Parse additional browser details from user agent
        browser_details = parse_browser_details(user_agent)
        os_details = parse_os_details(user_agent)
        
        entry = {
            'text': text,
            'timestamp': timestamp,
            'os': os_info,
            'osDetails': os_details,  # Additional OS information
            'browser': browser_info,
            'browserDetails': browser_details,  # Additional browser information
            'userAgent': user_agent,  # Store full user agent for analysis
            'isMobile': is_mobile,
            'mobileType': mobile_type,
            'novaClicks': nova_clicks
        }

        # Load existing data
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r') as f:
                existing_data = json.load(f)
        
        # Ensure existing_data is a list before appending
        if not isinstance(existing_data, list):
            app.logger.warning(f"Existing data in '{DATA_FILE}' is not a list during POST. Initializing as empty list for append.")
            existing_data = []

        app.logger.info(f"Received new data entry: OS: {os_info} ({os_details.get('version', '')}), Browser: {browser_info} ({browser_details.get('version', '')}), Text (partial): {text[:50]}...")

        existing_data.append(entry)

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
