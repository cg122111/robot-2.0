#!/bin/bash
# Quick activation script for the virtual environment

if [ ! -d "venv" ]; then
    echo "Virtual environment not found. Running setup..."
    ./setup_dev.sh
fi

source venv/bin/activate
echo "Virtual environment activated!"
echo "Run 'deactivate' to exit the virtual environment."

