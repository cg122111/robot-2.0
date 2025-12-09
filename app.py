#!/usr/bin/env python3
"""
Flask backend for Robot Control Interface
Designed for Raspberry Pi 3B
"""

from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS
import json
import os

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)  # Enable CORS for local development

# Current robot state
robot_state = {
    'rotate': 0,
    'extend': 0,
    'elevate': 0,
    'pinch': 0
}

@app.route('/')
def index():
    """Serve the main HTML page"""
    return send_from_directory('.', 'index.html')

@app.route('/api/robot/state', methods=['GET', 'POST'])
def robot_state_endpoint():
    """Get or update robot state"""
    global robot_state
    
    if request.method == 'POST':
        data = request.get_json()
        if data:
            robot_state.update({
                'rotate': data.get('rotate', robot_state['rotate']),
                'extend': data.get('extend', robot_state['extend']),
                'elevate': data.get('elevate', robot_state['elevate']),
                'pinch': data.get('pinch', robot_state['pinch'])
            })
            # TODO: Send commands to actual hardware here
            print(f"Robot state updated: {robot_state}")
            return jsonify({'status': 'success', 'state': robot_state})
    
    return jsonify({'status': 'success', 'state': robot_state})

@app.route('/api/robot/reset', methods=['POST'])
def reset_robot():
    """Reset robot to default position"""
    global robot_state
    robot_state = {
        'rotate': 0,
        'extend': 0,
        'elevate': 0,
        'pinch': 0
    }
    # TODO: Send reset command to hardware
    print("Robot reset to default position")
    return jsonify({'status': 'success', 'state': robot_state})

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'message': 'Robot control server is running'})

if __name__ == '__main__':
    print("Starting Robot Control Server...")
    print("Access the interface at: http://localhost:5000")
    print("Press Ctrl+C to stop the server")
    
    # Run on all interfaces (0.0.0.0) so it's accessible from other devices
    # Use port 5000 by default
    app.run(host='0.0.0.0', port=5000, debug=True)

