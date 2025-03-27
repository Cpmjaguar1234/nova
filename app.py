from flask import Flask, request, jsonify, render_template, redirect, session
from flask_cors import CORS
import google.generativeai as genai
import os
import re
from datetime import timedelta
import json

app = Flask(__name__)

# Update CORS configuration to allow all origins
CORS(app, resources={r"/*": {"origins": "*"}})

# Configure session
app.secret_key = os.urandom(24)
app.permanent_session_lifetime = timedelta(minutes=30)

# Securely load the API key from an environment variable
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY is not set in environment variables.")

genai.configure(api_key=api_key)

# Initialize the Gemini model
model = genai.GenerativeModel('gemini-2.0-flash-exp')

# Middleware to redirect to the specified URL unless on an endpoint
@app.before_request
def redirect_to_nova():
    # Check if the current endpoint is a valid route
    if request.endpoint is None:
        return redirect("https://cpmjaguar1234.github.io/nova")

@app.route('/ask', methods=['GET', 'POST'])
def ask_gemini():
    app.logger.info(f"Received {request.method} request at /ask")
    
    if request.method == 'POST':
        data = request.get_json()
        app.logger.info(f"POST data: {data}")
        user_input = data.get('q')
        
        # If the request contains article content, store it in session
        article_content = data.get('article')
        if article_content:
            session['article_content'] = article_content
            app.logger.info("Article content stored in session")
            
    else:
        user_input = request.args.get('q')
        app.logger.info(f"GET query parameter: {user_input}")
    
    if not user_input:
        app.logger.warning('No query parameter provided')
        return jsonify({'error': 'No query parameter provided'}), 400
        
    # If this is a question and we have stored article content, combine them
    if session.get('article_content'):
        user_input = f"{session['article_content']}\n\n{user_input}"

    try:
        response = model.generate_content(user_input)
        if response and hasattr(response, 'text'):
            cleaned_response = re.sub(r'\s+', ' ', response.text).strip()
            app.logger.info(f"Generated response: {cleaned_response}")
            return jsonify({'response': cleaned_response})
        else:
            app.logger.error('Failed to generate a valid response')
            return jsonify({'error': 'Failed to generate a valid response'}), 500
    except Exception as e:
        app.logger.error(f"Error during response generation: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/data', methods=['GET', 'POST'])
def handle_data():
    data_file = 'data.json'
    app.logger.info(f"Data endpoint called with {request.method} method")
    
    # Ensure the data file exists
    if not os.path.exists(data_file):
        with open(data_file, 'w') as f:
            json.dump([], f)
    
    if request.method == 'POST':
        try:
            if not request.is_json:
                app.logger.error('Request content type is not application/json')
                return jsonify({'error': 'Content-Type must be application/json'}), 400
                
            data = request.get_json()
            if 'text' not in data:
                app.logger.error('No text provided in request')
                return jsonify({'error': 'Text data is required'}), 400
                
            # Read existing data
            with open(data_file, 'r') as f:
                existing_data = json.load(f)
                
            # Append new data
            existing_data.append(data['text'])
            
            # Write back to file
            with open(data_file, 'w') as f:
                json.dump(existing_data, f, indent=2)
            
            app.logger.info('Data successfully added')
            return jsonify({'success': True, 'message': 'Data added successfully'})
            
        except Exception as e:
            app.logger.error(f'Error processing data: {str(e)}')
            return jsonify({'error': str(e)}), 500
    
    # GET method to retrieve all data
    try:
        with open(data_file, 'r') as f:
            data = json.load(f)
        return jsonify(data)
    except Exception as e:
        app.logger.error(f'Error reading data: {str(e)}')
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)