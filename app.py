#!/usr/bin/env python3
"""
Flask backend for Robot Control Interface
Designed for Raspberry Pi 3B
"""

from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS
import json
import os
import serial
import time
import sys

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)  # Enable CORS for local development

# Configuration
DEFAULT_PORT = "/dev/ttyUSB0"
BAUDRATE = 115200
READ_TIMEOUT = 2.0
FEEDRATE = 120000  # Default feedrate (steps per second)

# Motor to axis mapping
# M1 -> X (Rotate)
# M2 -> Y (Extend)
# M3 -> Z (Elevate)
# M4 -> E (Pinch)
MOTOR_AXIS_MAP = {
    "M1": "X",  # Rotate
    "M2": "Y",  # Extend
    "M3": "Z",  # Elevate
    "M4": "E",  # Pinch
}

# Step conversion factors (steps per unit)
# These can be adjusted based on your motor/gear configuration
STEPS_PER_DEGREE_ROTATE = 10.0   # steps per degree for rotation
STEPS_PER_PERCENT_EXTEND = 5.0   # steps per percent for extension
STEPS_PER_DEGREE_ELEVATE = 10.0  # steps per degree for elevation
STEPS_PER_PERCENT_PINCH = 3.0    # steps per percent for pinch

# Enable/disable hardware control (set to False to run in emulator mode)
# Can be overridden with ENABLE_HARDWARE environment variable
ENABLE_HARDWARE = os.environ.get('ENABLE_HARDWARE', 'true').lower() == 'true'
SERIAL_PORT = os.environ.get('SERIAL_PORT', DEFAULT_PORT)

# Current robot state
robot_state = {
    'rotate': 0,
    'extend': 0,
    'elevate': 0,
    'pinch': 0
}

# Previous robot state (to calculate relative moves)
previous_state = {
    'rotate': 0,
    'extend': 0,
    'elevate': 0,
    'pinch': 0
}

# Serial connection (initialized on first use)
serial_connection = None


class GCodeController:
    """Controller for sending G-code commands to stepper motors"""
    
    def __init__(self, port, baudrate=115200, timeout=2.0):
        self.port = port
        self.baudrate = baudrate
        self.timeout = timeout
        self.ser = None
        self.connected = False
    
    def connect(self):
        """Open serial connection to the controller"""
        if not ENABLE_HARDWARE:
            return False
        
        try:
            self.ser = serial.Serial(self.port, self.baudrate, timeout=self.timeout)
            time.sleep(2.0)  # Wait for connection to stabilize
            
            # Clear any pending data
            try:
                while self.ser.in_waiting:
                    self.ser.readline()
            except Exception:
                pass
            
            self.connected = True
            print(f"Connected to {self.port} at {self.baudrate} baud")
            return True
        except Exception as e:
            print(f"Error opening {self.port}: {e}", file=sys.stderr)
            self.connected = False
            return False
    
    def disconnect(self):
        """Close serial connection"""
        if self.ser and self.ser.is_open:
            self.ser.close()
            self.connected = False
            print("Disconnected from serial port")
    
    def send_line(self, line, verbose=False):
        """Send a G-code line and wait for OK response"""
        if not self.connected or not self.ser:
            return False
        
        try:
            if verbose:
                print(f">> {line}")
            
            self.ser.write((line + "\n").encode("ascii"))
            self.ser.flush()
            
            start = time.time()
            while time.time() - start < self.timeout:
                if self.ser.in_waiting:
                    resp = self.ser.readline().decode(errors="ignore").strip()
                    if resp:
                        if verbose:
                            print(f"<< {resp}")
                        if resp.lower().startswith("ok"):
                            return True
                time.sleep(0.01)
            
            return False
        except Exception as e:
            print(f"Error sending line '{line}': {e}", file=sys.stderr)
            self.connected = False
            return False
    
    def move_motor(self, motor, steps, feedrate=FEEDRATE, verbose=False):
        """Move a motor by a specified number of steps"""
        if not self.connected:
            if not self.connect():
                return False
        
        axis = MOTOR_AXIS_MAP.get(motor)
        if not axis:
            print(f"Unknown motor: {motor}", file=sys.stderr)
            return False
        
        move_cmd = f"G1 {axis}{steps} F{feedrate}"
        
        try:
            # Setup for relative moves
            if not self.send_line("G91", verbose=verbose):  # relative moves
                return False
            if not self.send_line("M211 S0", verbose=verbose):  # disable soft endstops
                return False
            if not self.send_line("G92 X0 Y0 Z0 E0", verbose=verbose):  # zero axes
                return False
            if not self.send_line(move_cmd, verbose=verbose):  # send move
                return False
            if not self.send_line("M400", verbose=verbose):  # wait for finish
                return False
            
            return True
        except Exception as e:
            print(f"Error moving motor {motor}: {e}", file=sys.stderr)
            return False


# Initialize G-code controller
gcode_controller = GCodeController(SERIAL_PORT, BAUDRATE, READ_TIMEOUT)


def convert_to_steps(axis, value, previous_value):
    """Convert robot state value to motor steps (relative)"""
    delta = value - previous_value
    if delta == 0:
        return 0
    # Always move a fixed 1750 steps in the direction of change
    return 1750 if delta > 0 else -1750


def send_motor_commands(new_state, old_state):
    """Send G-code commands to motors based on state changes"""
    if not ENABLE_HARDWARE:
        return
    
    # Map axes to motors
    axis_motor_map = {
        'rotate': 'M1',
        'extend': 'M2',
        'elevate': 'M3',
        'pinch': 'M4'
    }
    
    # Calculate and send moves for each axis that changed
    for axis, motor in axis_motor_map.items():
        steps = convert_to_steps(axis, new_state[axis], old_state[axis])
        # Only send command if there's a meaningful change (at least 1 step)
        if abs(steps) >= 1:
            if gcode_controller.move_motor(motor, steps, FEEDRATE, verbose=False):
                print(f"{motor} ({axis}) moved {steps} steps")
            else:
                print(f"Failed to move {motor} ({axis})", file=sys.stderr)

@app.route('/')
def index():
    """Serve the main HTML page"""
    return send_from_directory('.', 'index.html')

@app.route('/api/robot/state', methods=['GET', 'POST'])
def robot_state_endpoint():
    """Get or update robot state"""
    global robot_state, previous_state
    
    if request.method == 'POST':
        data = request.get_json()
        if data:
            # Store previous state
            previous_state = robot_state.copy()
            
            # Update robot state
            robot_state.update({
                'rotate': data.get('rotate', robot_state['rotate']),
                'extend': data.get('extend', robot_state['extend']),
                'elevate': data.get('elevate', robot_state['elevate']),
                'pinch': data.get('pinch', robot_state['pinch'])
            })
            
            # Send G-code commands to motors
            send_motor_commands(robot_state, previous_state)
            
            print(f"Robot state updated: {robot_state}")
            return jsonify({'status': 'success', 'state': robot_state})
    
    return jsonify({'status': 'success', 'state': robot_state})

@app.route('/api/robot/reset', methods=['POST'])
def reset_robot():
    """Reset robot to default position"""
    global robot_state, previous_state
    
    # Store previous state for relative move calculation
    previous_state = robot_state.copy()
    
    # Calculate steps needed to return to zero
    reset_state = {
        'rotate': 0,
        'extend': 0,
        'elevate': 0,
        'pinch': 0
    }
    
    # Send G-code commands to return to zero
    send_motor_commands(reset_state, robot_state)
    
    robot_state = reset_state.copy()
    print("Robot reset to default position")
    return jsonify({'status': 'success', 'state': robot_state})

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'message': 'Robot control server is running'})

@app.route('/api/robot/config', methods=['GET', 'POST'])
def robot_config():
    """Get or update robot configuration"""
    global STEPS_PER_DEGREE_ROTATE, STEPS_PER_PERCENT_EXTEND
    global STEPS_PER_DEGREE_ELEVATE, STEPS_PER_PERCENT_PINCH
    global ENABLE_HARDWARE, SERIAL_PORT, FEEDRATE
    
    if request.method == 'POST':
        data = request.get_json()
        if data:
            if 'steps_per_degree_rotate' in data:
                STEPS_PER_DEGREE_ROTATE = float(data['steps_per_degree_rotate'])
            if 'steps_per_percent_extend' in data:
                STEPS_PER_PERCENT_EXTEND = float(data['steps_per_percent_extend'])
            if 'steps_per_degree_elevate' in data:
                STEPS_PER_DEGREE_ELEVATE = float(data['steps_per_degree_elevate'])
            if 'steps_per_percent_pinch' in data:
                STEPS_PER_PERCENT_PINCH = float(data['steps_per_percent_pinch'])
            if 'enable_hardware' in data:
                ENABLE_HARDWARE = bool(data['enable_hardware'])
            if 'serial_port' in data:
                SERIAL_PORT = data['serial_port']
                gcode_controller.port = SERIAL_PORT
                gcode_controller.disconnect()
            if 'feedrate' in data:
                feedrate_value = int(data['feedrate'])
                if 1000 <= feedrate_value <= 500000:
                    FEEDRATE = feedrate_value
                    print(f"Feedrate updated to {FEEDRATE} steps/second")
                else:
                    return jsonify({'status': 'error', 'message': 'Feedrate must be between 1000 and 500000'}), 400
            
            return jsonify({'status': 'success', 'message': 'Configuration updated'})
    
    return jsonify({
        'status': 'success',
        'config': {
            'steps_per_degree_rotate': STEPS_PER_DEGREE_ROTATE,
            'steps_per_percent_extend': STEPS_PER_PERCENT_EXTEND,
            'steps_per_degree_elevate': STEPS_PER_DEGREE_ELEVATE,
            'steps_per_percent_pinch': STEPS_PER_PERCENT_PINCH,
            'enable_hardware': ENABLE_HARDWARE,
            'serial_port': SERIAL_PORT,
            'baudrate': BAUDRATE,
            'feedrate': FEEDRATE
        }
    })


if __name__ == '__main__':
    print("Starting Robot Control Server...")
    print(f"Hardware control: {'ENABLED' if ENABLE_HARDWARE else 'DISABLED (emulator mode)'}")
    if ENABLE_HARDWARE:
        print(f"Serial port: {SERIAL_PORT}")
        print(f"Baudrate: {BAUDRATE}")
    print("Access the interface at: http://localhost:5000")
    print("Press Ctrl+C to stop the server")
    
    try:
        # Run on all interfaces (0.0.0.0) so it's accessible from other devices
        # Use port 5000 by default
        app.run(host='0.0.0.0', port=5000, debug=True)
    except KeyboardInterrupt:
        print("\nShutting down...")
    finally:
        # Cleanup: disconnect from serial port
        gcode_controller.disconnect()

