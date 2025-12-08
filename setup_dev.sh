#!/bin/bash
# Setup script for Python development environment

echo "Setting up Python development environment..."

# Check if python3-venv is installed
if ! python3 -m venv --help &> /dev/null; then
    echo "python3-venv is not available. Installing..."
    echo "Please run: sudo apt install python3-venv"
    echo "Or on some systems: sudo apt install python3.12-venv"
    exit 1
fi

# Create virtual environment
echo "Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
python3 -m pip install --upgrade pip

# Install dependencies
echo "Installing dependencies..."
python3 -m pip install -r requirements.txt

echo ""
echo "✓ Development environment setup complete!"
echo ""
echo "To activate the virtual environment, run:"
echo "  source venv/bin/activate"
echo ""
echo "To deactivate, run:"
echo "  deactivate"
echo ""

