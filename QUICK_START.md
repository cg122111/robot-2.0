# Quick Start Guide

## Required: Install python3-venv First

Your system requires a virtual environment (PEP 668). You must install python3-venv:

```bash
sudo apt install python3-venv
```

## Then Set Up the Environment

```bash
# Create and set up virtual environment
./setup_dev.sh

# Activate it
source venv/bin/activate

# Run the app
python app.py
```

## Or Do It Manually

```bash
# Install python3-venv (one-time)
sudo apt install python3-venv

# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the app
python app.py
```

