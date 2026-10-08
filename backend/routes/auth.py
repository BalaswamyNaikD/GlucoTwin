"""
Authentication routes for doctor login and registration.
"""

import hashlib
import hmac
import json
import os
import time
from datetime import datetime, timedelta
from functools import wraps

import jwt
from flask import Blueprint, request, jsonify, current_app

auth_bp = Blueprint('auth', __name__)

_data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
_real_doctors_path = os.path.join(_data_dir, 'real_doctors.json')
_real_patients_path = os.path.join(_data_dir, 'real_patients.json')
_checkups_path = os.path.join(_data_dir, 'real_checkups.json')


def _safe_load_json(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def _safe_write_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)


def _normalize_email(email):
    return str(email).strip().lower()


def _normalize_patient_id(patient_id):
    return str(patient_id).strip().upper()

# Prototype user store
_prototype_users = {
    'doctor@hospital.com': {
        'id': '1',
        'email': 'doctor@hospital.com',
        'password_hash': hashlib.sha256('doctor123'.encode()).hexdigest(),
        'name': 'Dr. Sarah Johnson',
        'specialization': 'General Medicine',
        'role': 'doctor'
    },
    'admin@hospital.com': {
        'id': '2',
        'email': 'admin@hospital.com',
        'password_hash': hashlib.sha256('admin123'.encode()).hexdigest(),
        'name': 'Dr. Michael Chen',
        'specialization': 'Surgery',
        'role': 'admin'
    }
}

# Prototype patient store
_prototype_patient_users = {
    'patient@hospital.com': {
        'id': 'P-1000',
        'email': 'patient@hospital.com',
        'password_hash': hashlib.sha256('patient123'.encode()).hexdigest(),
        'name': 'John Doe',
        'role': 'patient',
        'age': 45,
        'gender': 'Male',
        'phone': '555-0100',
        'blood_group': 'O+',
        'conditions': ['Hypertension'],
        'vitals': {
            'heart_rate': 78,
            'blood_pressure': '130/85',
            'spo2': 97,
            'temperature': 98.6,
            'respiration_rate': 16,
            'blood_glucose': 110
        },
        'smartwatch_history': [
            {'label': 'Mon', 'heart_rate': 79, 'spo2': 97, 'systolic_bp': 132, 'diastolic_bp': 86, 'blood_glucose': 111},
            {'label': 'Tue', 'heart_rate': 77, 'spo2': 96, 'systolic_bp': 129, 'diastolic_bp': 84, 'blood_glucose': 108},
            {'label': 'Wed', 'heart_rate': 80, 'spo2': 97, 'systolic_bp': 131, 'diastolic_bp': 85, 'blood_glucose': 109},
            {'label': 'Thu', 'heart_rate': 76, 'spo2': 98, 'systolic_bp': 128, 'diastolic_bp': 83, 'blood_glucose': 107},
            {'label': 'Fri', 'heart_rate': 78, 'spo2': 97, 'systolic_bp': 130, 'diastolic_bp': 85, 'blood_glucose': 110},
            {'label': 'Sat', 'heart_rate': 81, 'spo2': 96, 'systolic_bp': 133, 'diastolic_bp': 87, 'blood_glucose': 112},
            {'label': 'Sun', 'heart_rate': 78, 'spo2': 97, 'systolic_bp': 130, 'diastolic_bp': 85, 'blood_glucose': 110}
        ],
        'ai_results': {
            'pain_score': 2,
            'voice_condition': 'healthy',
            'surgery_risk': 'low',
            'health_score': 82
        },
        'appointments': [
            {'id': 'APT-2001', 'date': '2026-03-10', 'doctor': 'Dr. Sarah Johnson', 'type': 'General Checkup', 'status': 'upcoming'},
            {'id': 'APT-2002', 'date': '2026-02-25', 'doctor': 'Dr. Michael Chen', 'type': 'Follow-up', 'status': 'completed'}
        ],
        'medications': [
            {'name': 'Amlodipine 5mg', 'dosage': 'Once daily', 'status': 'active'},
            {'name': 'Aspirin 75mg', 'dosage': 'Once daily', 'status': 'active'}
        ],
        'source': 'prototype'
    }
}


def _load_real_doctors_by_email():
    doctors = {}
    for doc in _safe_load_json(_real_doctors_path):
        email = _normalize_email(doc.get('email', ''))
        if not email:
            continue
        doctors[email] = {
            'id': doc.get('id', f"D-{len(doctors) + 3001}"),
            'email': email,
            'password_hash': doc.get('password_hash', ''),
            'name': doc.get('name', 'Unknown Doctor'),
            'specialization': doc.get('specialization', 'General Medicine'),
            'role': doc.get('role', 'doctor')
        }
    return doctors


def _load_real_patients_by_email():
    patients = {}
    for patient in _safe_load_json(_real_patients_path):
        email = _normalize_email(patient.get('email', ''))
        if not email:
            continue
        vitals = patient.get('vitals', {})
        patients[email] = {
            'id': patient.get('id', ''),
            'email': email,
            'password_hash': patient.get('password_hash', ''),
            'name': patient.get('name', 'Unknown Patient'),
            'role': 'patient',
            'age': patient.get('age', 0),
            'gender': patient.get('gender', 'Not specified'),
            'phone': patient.get('phone', patient.get('contact', '')),
            'blood_group': patient.get('blood_group', 'Unknown'),
            'conditions': patient.get('conditions', []),
            'status': patient.get('status', 'active'),
            'risk_level': patient.get('risk_level', patient.get('ai_results', {}).get('surgery_risk', 'low')),
            'vitals': {
                'heart_rate': vitals.get('heart_rate', 72),
                'blood_pressure': vitals.get('blood_pressure', '120/80'),
                'spo2': vitals.get('spo2', 98),
                'temperature': vitals.get('temperature', 98.6),
                'respiration_rate': vitals.get('respiration_rate', 16),
                'blood_glucose': vitals.get('blood_glucose', 95),
            },
            'smartwatch_history': patient.get('smartwatch_history', []),
            'ai_results': patient.get('ai_results', {
                'pain_score': 0,
                'voice_condition': 'healthy',
                'surgery_risk': 'low',
                'health_score': 90
            }),
            'appointments': patient.get('appointments', []),
            'medications': patient.get('medications', []),
            'source': patient.get('source', 'real')
        }
    return patients


def _build_user_stores():
    users = {k: dict(v) for k, v in _prototype_users.items()}
    users.update(_load_real_doctors_by_email())

    patient_users = {k: dict(v) for k, v in _prototype_patient_users.items()}
    patient_users.update(_load_real_patients_by_email())
    return users, patient_users


def _get_next_patient_counter(patient_users):
    max_id = 1000
    for user in patient_users.values():
        pid = str(user.get('id', ''))
        if pid.startswith('P-') and pid[2:].isdigit():
            max_id = max(max_id, int(pid[2:]))
    return max_id


def _get_next_appointment_counter(patient_users):
    max_id = 2002
    for user in patient_users.values():
        for appointment in user.get('appointments', []):
            aid = str(appointment.get('id', ''))
            if aid.startswith('APT-') and aid[4:].isdigit():
                max_id = max(max_id, int(aid[4:]))
    return max_id


_users, _patient_users = _build_user_stores()
_patient_counter = _get_next_patient_counter(_patient_users)
_appointment_counter = _get_next_appointment_counter(_patient_users)


def _generate_patient_id():
    """Generate a unique patient ID like P-1001, P-1002, etc."""
    global _patient_counter
    _patient_counter += 1
    return f'P-{_patient_counter}'


def _generate_appointment_id():
    """Generate a unique appointment ID like APT-2001."""
    global _appointment_counter
    _appointment_counter += 1
    return f'APT-{_appointment_counter}'


def _generate_smartwatch_history(vitals, days=7):
    """Generate smartwatch trend data for the requested number of days."""
    bp = vitals.get('blood_pressure', '120/80').split('/')
    systolic = int(bp[0]) if len(bp) > 0 and str(bp[0]).isdigit() else 120
    diastolic = int(bp[1]) if len(bp) > 1 and str(bp[1]).isdigit() else 80
    heart_rate = int(vitals.get('heart_rate', 72))
    spo2 = int(vitals.get('spo2', 98))
    glucose = int(vitals.get('blood_glucose', 95))

    base_hr_offsets = [2, -1, 3, -2, 1, 0, -1]
    base_spo2_offsets = [0, -1, 0, 1, 0, -1, 0]
    base_sys_offsets = [2, -3, 1, 0, -2, 2, -1]
    base_dia_offsets = [1, -2, 0, 1, -1, 1, 0]
    base_glucose_offsets = [4, -2, 3, -1, 2, -3, 1]

    history = []
    start_date = datetime.now() - timedelta(days=max(days - 1, 0))
    for i in range(days):
        label = (start_date + timedelta(days=i)).strftime('%b %d')
        hr_offset = base_hr_offsets[i % len(base_hr_offsets)]
        spo2_offset = base_spo2_offsets[i % len(base_spo2_offsets)]
        sys_offset = base_sys_offsets[i % len(base_sys_offsets)]
        dia_offset = base_dia_offsets[i % len(base_dia_offsets)]
        glucose_offset = base_glucose_offsets[i % len(base_glucose_offsets)]
        history.append({
            'label': label,
            'heart_rate': max(45, heart_rate + hr_offset),
            'spo2': max(88, min(100, spo2 + spo2_offset)),
            'systolic_bp': max(90, systolic + sys_offset),
            'diastolic_bp': max(55, diastolic + dia_offset),
            'blood_glucose': max(70, glucose + glucose_offset),
        })
    return history


def _default_smartwatch_history(vitals):
    """Generate a default 30-day smartwatch trend from current vitals."""
    return _generate_smartwatch_history(vitals, days=30)


def _load_checkups():
    return _safe_load_json(_checkups_path)


def _persist_doctor_to_real_store(user):
    docs = _safe_load_json(_real_doctors_path)
    email = _normalize_email(user.get('email', ''))
    docs = [d for d in docs if _normalize_email(d.get('email', '')) != email]
    docs.append({
        'id': user['id'],
        'email': email,
        'password_hash': user['password_hash'],
        'name': user['name'],
        'specialization': user.get('specialization', 'General'),
        'role': user.get('role', 'doctor')
    })
    _safe_write_json(_real_doctors_path, docs)


def _persist_patient_to_real_store(user):
    if user.get('source') == 'prototype':
        return
    patients = _safe_load_json(_real_patients_path)
    email = _normalize_email(user.get('email', ''))
    patients = [p for p in patients if _normalize_email(p.get('email', '')) != email]
    patients.append({
        'id': user['id'],
        'email': email,
        'password_hash': user['password_hash'],
        'name': user['name'],
        'role': 'patient',
        'age': user.get('age', 0),
        'gender': user.get('gender', 'Not specified'),
        'phone': user.get('phone', ''),
        'blood_group': user.get('blood_group', 'Unknown'),
        'conditions': user.get('conditions', []),
        'status': user.get('status', 'active'),
        'risk_level': user.get('risk_level', user.get('ai_results', {}).get('surgery_risk', 'low')),
        'vitals': user.get('vitals', {}),
        'smartwatch_history': user.get('smartwatch_history', []),
        'ai_results': user.get('ai_results', {}),
        'appointments': user.get('appointments', []),
        'medications': user.get('medications', []),
        'source': 'real'
    })
    _safe_write_json(_real_patients_path, patients)


def _generate_token(user):
    """Generate JWT token for authenticated user."""
    payload = {
        'user_id': user['id'],
        'email': user['email'],
        'name': user['name'],
        'role': user['role'],
        'exp': int(time.time()) + 86400  # 24 hours
    }
    return jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')


def require_auth(f):
    """Decorator to require authentication."""
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


@auth_bp.route('/login', methods=['POST'])
def login():
    """Doctor login endpoint."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body required'}), 400

    email = _normalize_email(data.get('email', ''))
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400

    user = _users.get(email)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    password_hash = hashlib.sha256(password.encode()).hexdigest()
    if not hmac.compare_digest(user['password_hash'], password_hash):
        return jsonify({'error': 'Invalid credentials'}), 401

    token = _generate_token(user)

    return jsonify({
        'success': True,
        'token': token,
        'user': {
            'id': user['id'],
            'name': user['name'],
            'email': user['email'],
            'specialization': user['specialization'],
            'role': user['role']
        }
    })


@auth_bp.route('/register', methods=['POST'])
def register():
    """Doctor registration endpoint."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body required'}), 400

    email = _normalize_email(data.get('email', ''))
    password = data.get('password', '')
    name = data.get('name', '').strip()
    specialization = data.get('specialization', '').strip()

    if not all([email, password, name]):
        return jsonify({'error': 'Email, password, and name are required'}), 400

    if email in _users:
        return jsonify({'error': 'Email already registered'}), 409

    user = {
        'id': str(len(_users) + 1),
        'email': email,
        'password_hash': hashlib.sha256(password.encode()).hexdigest(),
        'name': name,
        'specialization': specialization or 'General',
        'role': 'doctor'
    }
    _users[email] = user
    _persist_doctor_to_real_store(user)

    token = _generate_token(user)

    return jsonify({
        'success': True,
        'token': token,
        'user': {
            'id': user['id'],
            'name': user['name'],
            'email': user['email'],
            'specialization': user['specialization'],
            'role': user['role']
        }
    }), 201


@auth_bp.route('/patient/register', methods=['POST'])
def patient_register():
    """Patient registration - auto-generates patient ID."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body required'}), 400

    email = _normalize_email(data.get('email', ''))
    password = data.get('password', '')
    name = data.get('name', '').strip()
    age = data.get('age', 0)
    gender = data.get('gender', '').strip()
    phone = data.get('phone', '').strip()
    blood_group = data.get('blood_group', '').strip()

    if not all([email, password, name]):
        return jsonify({'error': 'Email, password, and name are required'}), 400

    if email in _patient_users:
        return jsonify({'error': 'Email already registered'}), 409

    patient_id = _generate_patient_id()

    user = {
        'id': patient_id,
        'email': email,
        'password_hash': hashlib.sha256(password.encode()).hexdigest(),
        'name': name,
        'role': 'patient',
        'age': int(age) if age else 0,
        'gender': gender or 'Not specified',
        'phone': phone,
        'blood_group': blood_group or 'Unknown',
        'conditions': [],
        'vitals': {
            'heart_rate': 72,
            'blood_pressure': '120/80',
            'spo2': 98,
            'temperature': 98.6,
            'respiration_rate': 16,
            'blood_glucose': 95
        },
        'smartwatch_history': _default_smartwatch_history({
            'heart_rate': 72,
            'blood_pressure': '120/80',
            'spo2': 98,
            'blood_glucose': 95
        }),
        'ai_results': {
            'pain_score': 0,
            'voice_condition': 'healthy',
            'surgery_risk': 'low',
            'health_score': 90
        },
        'appointments': [],
        'medications': []
    }
    _patient_users[email] = user
    _persist_patient_to_real_store(user)

    token = _generate_token(user)

    return jsonify({
        'success': True,
        'token': token,
        'user': {
            'id': user['id'],
            'name': user['name'],
            'email': user['email'],
            'role': user['role'],
            'age': user['age'],
            'gender': user['gender'],
            'blood_group': user['blood_group']
        }
    }), 201


@auth_bp.route('/patient/login', methods=['POST'])
def patient_login():
    """Patient login endpoint."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body required'}), 400

    email = _normalize_email(data.get('email', ''))
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400

    user = _patient_users.get(email)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    password_hash = hashlib.sha256(password.encode()).hexdigest()
    if not hmac.compare_digest(user['password_hash'], password_hash):
        return jsonify({'error': 'Invalid credentials'}), 401

    token = _generate_token(user)

    return jsonify({
        'success': True,
        'token': token,
        'user': {
            'id': user['id'],
            'name': user['name'],
            'email': user['email'],
            'role': user['role'],
            'age': user['age'],
            'gender': user['gender'],
            'blood_group': user['blood_group']
        }
    })


@auth_bp.route('/patient/profile', methods=['GET'])
@require_auth
def get_patient_profile():
    """Get full patient profile with health data."""
    email = request.current_user.get('email')
    user = _patient_users.get(email)
    if not user:
        return jsonify({'error': 'Patient not found'}), 404

    patient_id = _normalize_patient_id(user.get('id', ''))
    checkups = [
        c for c in _load_checkups()
        if _normalize_patient_id(c.get('patient_id', '')) == patient_id
    ]
    checkups.sort(key=lambda c: c.get('date', ''), reverse=True)

    return jsonify({
        'success': True,
        'patient': {
            'id': user['id'],
            'name': user['name'],
            'email': user['email'],
            'age': user['age'],
            'gender': user['gender'],
            'phone': user['phone'],
            'blood_group': user['blood_group'],
            'conditions': user['conditions'],
            'vitals': user['vitals'],
            'smartwatch_history': user.get('smartwatch_history', _default_smartwatch_history(user['vitals'])),
            'ai_results': user['ai_results'],
            'appointments': user['appointments'],
            'medications': user['medications'],
            'checkups': checkups
        }
    })


@auth_bp.route('/patient/smartwatch-history', methods=['GET'])
@require_auth
def get_patient_smartwatch_history():
    """Get smartwatch historical trend data for authenticated patient."""
    days = request.args.get('days', '7')
    try:
        days = int(days)
    except ValueError:
        days = 7
    if days not in [7, 14, 30]:
        days = 7

    email = request.current_user.get('email')
    user = _patient_users.get(email)
    if not user:
        return jsonify({'error': 'Patient not found'}), 404

    history = user.get('smartwatch_history')
    if not history:
        history = _default_smartwatch_history(user.get('vitals', {}))
        user['smartwatch_history'] = history

    if len(history) < days:
        history = _generate_smartwatch_history(user.get('vitals', {}), days=days)
    else:
        history = history[-days:]

    return jsonify({
        'success': True,
        'history': history,
        'days': days,
        'total': len(history)
    })


@auth_bp.route('/patient/appointments', methods=['POST'])
@require_auth
def create_patient_appointment():
    """Create a new appointment for authenticated patient."""
    email = request.current_user.get('email')
    user = _patient_users.get(email)
    if not user:
        return jsonify({'error': 'Patient not found'}), 404

    data = request.get_json() or {}
    appointment_date = data.get('date', '').strip()
    doctor = data.get('doctor', '').strip()
    appointment_type = data.get('type', '').strip()

    if not appointment_date or not doctor or not appointment_type:
        return jsonify({'error': 'date, doctor, and type are required'}), 400

    try:
        requested_date = datetime.strptime(appointment_date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

    if requested_date < datetime.now().date():
        return jsonify({'error': 'Cannot book appointment for a past date'}), 400

    appointment = {
        'id': _generate_appointment_id(),
        'date': appointment_date,
        'doctor': doctor,
        'type': appointment_type,
        'status': 'upcoming'
    }

    user.setdefault('appointments', []).append(appointment)
    _persist_patient_to_real_store(user)

    return jsonify({
        'success': True,
        'appointment': appointment,
        'appointments': user['appointments']
    }), 201


@auth_bp.route('/patient/appointments/<appointment_id>/cancel', methods=['PATCH'])
@require_auth
def cancel_patient_appointment(appointment_id):
    """Cancel an existing patient appointment by appointment ID."""
    email = request.current_user.get('email')
    user = _patient_users.get(email)
    if not user:
        return jsonify({'error': 'Patient not found'}), 404

    appointments = user.setdefault('appointments', [])
    appointment = next((a for a in appointments if str(a.get('id')) == str(appointment_id)), None)

    if not appointment:
        return jsonify({'error': 'Appointment not found'}), 404

    if appointment.get('status') == 'cancelled':
        return jsonify({'error': 'Appointment is already cancelled'}), 400

    appointment['status'] = 'cancelled'
    _persist_patient_to_real_store(user)

    return jsonify({
        'success': True,
        'appointment': appointment,
        'appointments': appointments
    })


@auth_bp.route('/patients/registered', methods=['GET'])
def get_registered_patients():
    """Get all registered patients (for doctor dashboard)."""
    checkups = _load_checkups()
    patients_list = []
    for email, user in _patient_users.items():
        patient_id = _normalize_patient_id(user.get('id', ''))
        checkup_count = sum(
            1 for c in checkups
            if _normalize_patient_id(c.get('patient_id', '')) == patient_id
        )
        patients_list.append({
            'id': user['id'],
            'name': user['name'],
            'email': user['email'],
            'age': user['age'],
            'gender': user['gender'],
            'blood_group': user['blood_group'],
            'conditions': user['conditions'],
            'vitals': user['vitals'],
            'ai_results': user['ai_results'],
            'appointments': user.get('appointments', []),
            'medications': user.get('medications', []),
            'status': 'active',
            'risk_level': user['ai_results'].get('surgery_risk', 'low'),
            'source': user.get('source', 'prototype'),
            'checkup_count': checkup_count
        })
    return jsonify({
        'success': True,
        'patients': patients_list,
        'total': len(patients_list)
    })


@auth_bp.route('/patients/by-id/<patient_id>', methods=['GET'])
def get_patient_by_unique_id(patient_id):
    """Get registered patient data by unique patient ID (e.g., P-1001)."""
    normalized_id = _normalize_patient_id(patient_id)
    patient = next(
        (u for u in _patient_users.values() if str(u.get('id', '')).upper() == normalized_id),
        None
    )

    if not patient:
        return jsonify({'success': False, 'error': 'Patient ID not found'}), 404

    checkups = [
        c for c in _load_checkups()
        if _normalize_patient_id(c.get('patient_id', '')) == normalized_id
    ]
    checkups.sort(key=lambda c: c.get('date', ''), reverse=True)

    return jsonify({
        'success': True,
        'patient': {
            'id': patient['id'],
            'name': patient['name'],
            'email': patient.get('email'),
            'age': patient.get('age'),
            'gender': patient.get('gender'),
            'blood_group': patient.get('blood_group'),
            'conditions': patient.get('conditions', []),
            'vitals': patient.get('vitals', {}),
            'ai_results': patient.get('ai_results', {}),
            'appointments': patient.get('appointments', []),
            'medications': patient.get('medications', []),
            'smartwatch_history': patient.get('smartwatch_history', []),
            'checkups': checkups,
            'status': 'active',
            'risk_level': patient.get('ai_results', {}).get('surgery_risk', 'low'),
            'source': patient.get('source', 'registered')
        }
    })


@auth_bp.route('/doctors', methods=['GET'])
def get_doctors():
    """Get all available doctors (prototype + real) without credentials."""
    doctors = []
    for user in _users.values():
        if user.get('role') not in ('doctor', 'admin'):
            continue
        doctors.append({
            'id': user.get('id'),
            'name': user.get('name'),
            'email': user.get('email'),
            'specialization': user.get('specialization', 'General Medicine'),
            'role': user.get('role', 'doctor'),
            'source': 'prototype' if _normalize_email(user.get('email', '')) in _prototype_users else 'real'
        })

    doctors.sort(key=lambda d: d.get('name', ''))
    return jsonify({'success': True, 'doctors': doctors, 'total': len(doctors)})


@auth_bp.route('/me', methods=['GET'])
@require_auth
def get_current_user():
    """Get current authenticated user."""
    return jsonify({
        'success': True,
        'user': request.current_user
    })
