"""
Simple Flask application providing:
- A health check endpoint (`/health`).
- A placeholder endpoint for processing gesture data (`/process-gesture`).

Used potentially for separate ML processing or other backend tasks.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health_check():
    """Returns a simple health status."""
    return jsonify({"status": "healthy"})

@app.route('/process-gesture', methods=['POST'])
def process_gesture():
    """Placeholder endpoint to receive gesture data and return a mock response."""
    # Placeholder for ML processing
    gesture_data = request.json
    return jsonify({
        "processed": True,
        "effect": gesture_data["type"],
        "parameters": gesture_data["parameters"]
    })

if __name__ == '__main__':
    app.run(port=5000)
