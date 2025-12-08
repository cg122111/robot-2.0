# Development Environment Setup

## Quick Start

1. **Install python3-venv** (if not already installed):
   ```bash
   sudo apt install python3-venv
   ```

2. **Run the setup script**:
   ```bash
   ./setup_dev.sh
   ```

3. **Activate the virtual environment**:
   ```bash
   source venv/bin/activate
   ```

4. **Run the application**:
   ```bash
   python app.py
   ```

## Manual Setup

If the setup script doesn't work, you can set up manually:

```bash
# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt
```

## Daily Workflow

1. **Activate the environment**:
   ```bash
   source venv/bin/activate
   # Or use the helper:
   ./activate.sh
   ```

2. **Work on your code**

3. **Run the server**:
   ```bash
   python app.py
   # Or use the startup script:
   ./start.sh
   ```

4. **Deactivate when done**:
   ```bash
   deactivate
   ```

## Troubleshooting

### "python3-venv not found"
Install it with:
```bash
sudo apt install python3-venv
# Or for specific Python version:
sudo apt install python3.12-venv
```

### "Permission denied" on scripts
Make scripts executable:
```bash
chmod +x setup_dev.sh activate.sh start.sh
```

### Virtual environment not activating
Make sure you're in the project directory and the venv folder exists:
```bash
ls -la venv/
```

