from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

@app.route('/process-gesture', methods=['POST'])
def process_gesture():
    # Placeholder for ML processing
    gesture_data = request.json
    return jsonify({
        "processed": True,
        "effect": gesture_data["type"],
        "parameters": gesture_data["parameters"]
    })

if __name__ == '__main__':
    app.run(port=5000)
