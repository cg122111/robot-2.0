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
   
   **Note**: The `requirements.txt` includes `pyserial` for G-code stepper motor control. If you only need emulator mode, you can skip installing it.

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

The Flask backend (`app.py`) includes G-code support for controlling stepper motors via serial communication (Marlin-compatible controllers).

### G-Code Stepper Motor Control

The robot interface can send G-code commands to stepper motors connected via USB serial port. The system maps robot axes to motors:

- **Rotate** → M1 (X-axis)
- **Extend** → M2 (Y-axis)
- **Elevate** → M3 (Z-axis)
- **Pinch** → M4 (E-axis)

### Enabling Hardware Control

By default, hardware control is **disabled** (emulator mode). To enable G-code control:

1. **Set environment variable**:
   ```bash
   export ENABLE_HARDWARE=true
   export SERIAL_PORT=/dev/ttyUSB0  # Adjust to your port
   python app.py
   ```

2. **Or modify the code** in `app.py`:
   ```python
   ENABLE_HARDWARE = True
   SERIAL_PORT = "/dev/ttyUSB0"  # Your serial port
   ```

### Configuration

The system uses configurable step conversion factors:

- `STEPS_PER_DEGREE_ROTATE`: Steps per degree for rotation (default: 10.0)
- `STEPS_PER_PERCENT_EXTEND`: Steps per percent for extension (default: 5.0)
- `STEPS_PER_DEGREE_ELEVATE`: Steps per degree for elevation (default: 10.0)
- `STEPS_PER_PERCENT_PINCH`: Steps per percent for pinch (default: 3.0)

Adjust these values in `app.py` based on your motor/gear configuration, or use the configuration API endpoint.

### API Endpoints

- `POST /api/robot/state`: Receives robot state updates and sends G-code commands
- `POST /api/robot/reset`: Resets robot to default position
- `GET /api/robot/config`: Get current configuration
- `POST /api/robot/config`: Update configuration (step conversion factors, hardware enable, serial port)
- `GET /api/health`: Health check endpoint

### Configuration API Example

```bash
# Get current configuration
curl http://localhost:5000/api/robot/config

# Update step conversion factors
curl -X POST http://localhost:5000/api/robot/config \
  -H "Content-Type: application/json" \
  -d '{
    "steps_per_degree_rotate": 20.0,
    "enable_hardware": true,
    "serial_port": "/dev/ttyUSB0"
  }'
```

### G-Code Commands Sent

When hardware is enabled, the system sends the following G-code sequence for each movement:

1. `G91` - Set relative positioning mode
2. `M211 S0` - Disable soft endstops
3. `G92 X0 Y0 Z0 E0` - Zero all axes
4. `G1 {axis}{steps} F{feedrate}` - Move motor
5. `M400` - Wait for movement to complete

The default feedrate is 2000 steps/second, configurable in the code.

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

