from flask import Flask, request, jsonify
from flask_cors import CORS
from square.client import Client
import os

# --- Configuration ---
# Install requirements: pip install flask flask-cors squareup
# Set your Square Access Token in your environment variables:
# export SQUARE_ACCESS_TOKEN='your_square_access_token_here'

app = Flask(__name__)
# Enable CORS so your website (novaedu.us.kg) can talk to this API
CORS(app) 

# Initialize Square Client
square_client = Client(
    access_token=os.environ.get('SQUARE_ACCESS_TOKEN', 'YOUR_ACCESS_TOKEN_HERE'),
    environment='production'  # Use 'sandbox' for testing, 'production' for live
)

@app.route('/api/verify-license', methods=['POST'])
def verify_license():
    """
    Verifies a license key against Square Orders.
    Expects JSON: { "key": "ORDER_ID_FROM_USER" }
    """
    data = request.json
    license_key = data.get('key')

    if not license_key:
        return jsonify({
            "valid": False, 
            "error": "No key provided"
        }), 400

    try:
        # We assume the License Key provided by the user is the Square Order ID.
        # We attempt to retrieve this order from Square.
        result = square_client.orders.retrieve_order(order_id=license_key)

        if result.is_success():
            order = result.body['order']
            state = order.get('state')
            
            # Check if the order is paid (COMPLETED or OPEN often means paid in Square POS)
            # You can also check line_items to ensure they bought the "Nova" product specifically.
            if state in ['COMPLETED', 'OPEN']:
                return jsonify({
                    "valid": True, 
                    "status": "active",
                    "customer_id": order.get('customer_id')
                })
            else:
                return jsonify({
                    "valid": False, 
                    "status": "inactive", 
                    "reason": f"Order state is {state} (not completed)"
                }), 402  # Payment Required

        elif result.is_error():
            # Square returns errors if the ID is malformed or not found
            errors = result.errors
            return jsonify({
                "valid": False, 
                "error": "Invalid Key or Order ID not found",
                "details": errors
            }), 404

    except Exception as e:
        print(f"Internal Error: {str(e)}")
        return jsonify({
            "valid": False, 
            "error": "Internal Server Error"
        }), 500

if __name__ == '__main__':
    print("Starting Nova License Server...")
    # Run on port 5000 (default)
    app.run(host='0.0.0.0', port=5000)
