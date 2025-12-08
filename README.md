# Robot Control Interface

A web-based control interface for a 3-axis robot arm with visual emulator. Designed to run on Raspberry Pi 3B.

## Features

- **3-Axis Control**: Rotate, Elevate, and Pinch controls
- **Visual 3D Emulator**: Real-time 3D visualization using Three.js
- **Multiple Control Methods**: 
  - Button controls (+/- for each axis)
  - Slider controls
  - Keyboard shortcuts (Q/E for rotate, W/S for elevate, A/D for pinch, R for reset)
- **Responsive Design**: Works on desktop and mobile devices
- **Backend API**: Flask server ready for hardware integration

## Installation

### Development Environment Setup (Recommended)

1. **Install Python 3 and venv** (if not already installed):
   ```bash
   sudo apt update
   sudo apt install python3 python3-pip python3-venv
   ```

2. **Clone or download this project**:
   ```bash
   cd ~
   git clone <your-repo-url> robot
   cd robot
   ```

3. **Install python3-venv** (required for virtual environments):
   ```bash
   sudo apt install python3-venv
   ```

4. **Set up the Python virtual environment**:
   ```bash
   # Run the setup script
   ./setup_dev.sh
   
   # Or manually:
   python3 -m venv venv
   source venv/bin/activate
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

5. **Activate the virtual environment** (whenever you work on the project):
   ```bash
   source venv/bin/activate
   # Or use the helper script:
   ./activate.sh
   ```

6. **Run the server**:
   ```bash
   # If virtual environment is activated, use:
   python app.py
   # Otherwise, use:
   python3 app.py
   # Or simply use the startup script:
   ./start.sh
   ```

7. **Access the interface**:
   - On the Raspberry Pi: Open browser to `http://localhost:5000`
   - From another device on the same network: `http://<raspberry-pi-ip>:5000`

**Note**: Modern Linux systems (PEP 668) require virtual environments. You cannot install packages system-wide with pip. The virtual environment setup above is required.

## Usage

### Control Methods

1. **Button Controls**: Click the +/- buttons to adjust each axis
2. **Slider Controls**: Drag the sliders for smooth control
3. **Keyboard Shortcuts**:
   - `Q` / `E`: Rotate left/right
   - `W` / `S`: Elevate up/down
   - `A` / `D`: Pinch close/open
   - `R`: Reset all axes

### Axis Ranges

- **Rotate**: -180° to +180°
- **Elevate**: -90° to +90°
- **Pinch**: 0% to 100%

## Hardware Integration

The Flask backend (`app.py`) includes endpoints ready for hardware integration:

- `POST /api/robot/state`: Receives robot state updates
- `POST /api/robot/reset`: Resets robot to default position
- `GET /api/health`: Health check endpoint

To integrate with actual hardware, modify the `robot_state_endpoint()` function in `app.py` to send commands to your motor controllers (e.g., GPIO pins, I2C devices, serial communication).

### Example Hardware Integration

```python
import RPi.GPIO as GPIO

# In robot_state_endpoint():
# GPIO.setmode(GPIO.BCM)
# # Control servo motors based on robot_state values
# # rotate_servo.angle = robot_state['rotate']
# # elevate_servo.angle = robot_state['elevate']
# # pinch_servo.position = robot_state['pinch']
```

## File Structure

```
robot/
├── app.py              # Flask backend server
├── index.html          # Main HTML interface
├── styles.css          # CSS styling
├── app.js              # JavaScript for controls and 3D visualization
├── requirements.txt    # Python dependencies
├── setup_dev.sh        # Development environment setup script
├── activate.sh         # Quick activation helper script
├── start.sh            # Server startup script
├── .gitignore         # Git ignore file
└── README.md          # This file
```

## Development

### Virtual Environment

Always activate the virtual environment before working on the project:

```bash
source venv/bin/activate
```

When you're done, deactivate it:

```bash
deactivate
```

### Running in Emulator Mode

The interface works without the backend for testing. Simply open `index.html` in a web browser. The 3D visualization will work, but API calls will fail silently.

### Testing the Backend

```bash
# Test health endpoint
curl http://localhost:5000/api/health

# Test state update
curl -X POST http://localhost:5000/api/robot/state \
  -H "Content-Type: application/json" \
  -d '{"rotate": 45, "elevate": 30, "pinch": 50}'
```

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers (iOS Safari, Chrome Mobile)

## Troubleshooting

1. **"Command 'python' not found"**: 
   - If using a virtual environment, activate it first: `source venv/bin/activate`
   - Otherwise, use `python3` instead of `python`
   - Or install the python-is-python3 package: `sudo apt install python-is-python3`

2. **Port already in use**: Change the port in `app.py` (line 70)

3. **3D visualization not showing**: Ensure JavaScript is enabled and Three.js CDN is accessible

4. **Backend not responding**: Check firewall settings on Raspberry Pi

## License

This project is provided as-is for educational and development purposes.

