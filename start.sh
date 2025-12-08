#!/bin/bash
# Startup script for Robot Control Interface

# Check if virtual environment exists and activate it
if [ -d "venv" ] && [ -f "venv/bin/activate" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
elif [ -d "venv" ]; then
    echo "Warning: Virtual environment directory exists but is not properly set up."
    echo "Removing incomplete venv and setting up fresh environment..."
    rm -rf venv
    echo "Please run './setup_dev.sh' to set up the development environment."
    echo "Continuing with system Python (Flask must be installed)..."
else
    echo "Error: Virtual environment not found."
    echo ""
    echo "Your system requires a virtual environment (PEP 668)."
    echo "Please run the following commands:"
    echo "  1. sudo apt install python3-venv"
    echo "  2. ./setup_dev.sh"
    echo "  3. source venv/bin/activate"
    echo "  4. python app.py"
    echo ""
    exit 1
fi

echo "Starting Robot Control Interface..."
echo ""

# Use python3 if python is not available (common on Linux)
if command -v python &> /dev/null; then
    python app.py
else
    python3 app.py
fi

