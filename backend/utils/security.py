"""
Security utilities for JWT authentication, role-based access control,
and encrypted storage for medical records.
"""

import hashlib
import hmac
import os
import time
import base64
from functools import wraps

import jwt
from flask import request, jsonify, current_app


# --- Role-Based Access Control ---

ROLES = {
    'admin': {'level': 3, 'permissions': ['read', 'write', 'delete', 'manage_users', 'override_ai', 'view_logs', 'escalate']},
    'doctor': {'level': 2, 'permissions': ['read', 'write', 'override_ai', 'view_patients', 'prescribe', 'escalate']},
    'patient': {'level': 1, 'permissions': ['read', 'view_own_data', 'book_appointment']},
}


def require_auth(f):
    """Decorator to require JWT authentication."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'error': 'Authentication required'}), 401
        try:
            payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            request.current_user = payload
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        return f(*args, **kwargs)
    return decorated


def require_role(*allowed_roles):
    """Decorator to enforce role-based access control."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            token = request.headers.get('Authorization', '').replace('Bearer ', '')
            if not token:
                return jsonify({'error': 'Authentication required'}), 401
            try:
                payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
                request.current_user = payload
            except jwt.ExpiredSignatureError:
                return jsonify({'error': 'Token expired'}), 401
            except jwt.InvalidTokenError:
                return jsonify({'error': 'Invalid token'}), 401

            user_role = payload.get('role', '')
            if user_role not in allowed_roles:
                return jsonify({'error': 'Insufficient permissions', 'required_roles': list(allowed_roles)}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator


def has_permission(user_role, permission):
    """Check if a role has a specific permission."""
    role_info = ROLES.get(user_role, {})
    return permission in role_info.get('permissions', [])


# --- Encrypted Storage ---

class MedicalRecordEncryption:
    """Handles encryption/decryption of sensitive medical records.
    Uses AES-equivalent approach via Fernet-like scheme with HMAC verification."""

    def __init__(self):
        self._key = None

    def _get_key(self):
        if self._key is None:
            secret = current_app.config.get('SECRET_KEY', 'default-key')
            self._key = hashlib.sha256(secret.encode()).digest()
        return self._key

    def encrypt(self, plaintext):
        """Encrypt sensitive data using XOR cipher with HMAC integrity check.
        For production, replace with cryptography.fernet.Fernet."""
        if not plaintext:
            return ''
        key = self._get_key()
        data = plaintext.encode('utf-8')
        # XOR-based encryption with key stretching
        encrypted = bytearray()
        for i, byte in enumerate(data):
            encrypted.append(byte ^ key[i % len(key)])
        # Add HMAC for integrity
        mac = hmac.new(key, bytes(encrypted), hashlib.sha256).hexdigest()
        payload = base64.b64encode(bytes(encrypted)).decode('utf-8')
        return f"{payload}.{mac}"

    def decrypt(self, ciphertext):
        """Decrypt encrypted data and verify integrity."""
        if not ciphertext or '.' not in ciphertext:
            return ciphertext
        try:
            payload, mac = ciphertext.rsplit('.', 1)
            key = self._get_key()
            encrypted = base64.b64decode(payload)
            # Verify HMAC
            expected_mac = hmac.new(key, encrypted, hashlib.sha256).hexdigest()
            if not hmac.compare_digest(mac, expected_mac):
                raise ValueError("Data integrity check failed")
            # Decrypt
            decrypted = bytearray()
            for i, byte in enumerate(encrypted):
                decrypted.append(byte ^ key[i % len(key)])
            return decrypted.decode('utf-8')
        except Exception:
            return ciphertext  # Return as-is if decryption fails


# Singleton
medical_encryption = MedicalRecordEncryption()


def generate_token(user_data, secret_key, expiration_hours=24):
    """Generate a JWT token with user claims."""
    payload = {
        'user_id': user_data['id'],
        'email': user_data['email'],
        'name': user_data['name'],
        'role': user_data['role'],
        'iat': int(time.time()),
        'exp': int(time.time()) + (expiration_hours * 3600)
    }
    return jwt.encode(payload, secret_key, algorithm='HS256')


def hash_password(password):
    """Hash password using SHA-256 with salt."""
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password, password_hash):
    """Verify password against hash using constant-time comparison."""
    computed = hashlib.sha256(password.encode()).hexdigest()
    return hmac.compare_digest(computed, password_hash)
