"""Utility helper functions."""

import base64
import hashlib
from datetime import datetime


def get_timestamp():
    """Get current ISO timestamp."""
    return datetime.now().isoformat()


def hash_password(password):
    """Hash password using SHA-256."""
    return hashlib.sha256(password.encode()).hexdigest()


def encode_image_to_base64(image_path):
    """Encode image file to base64 string."""
    with open(image_path, 'rb') as f:
        return base64.b64encode(f.read()).decode('utf-8')


def validate_email(email):
    """Basic email validation."""
    return '@' in email and '.' in email.split('@')[1]


def clamp(value, min_val, max_val):
    """Clamp a value between min and max."""
    return max(min_val, min(max_val, value))
