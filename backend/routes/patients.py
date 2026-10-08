"""Patient management routes."""

import json
import os
from datetime import datetime

from flask import Blueprint, jsonify, request

patients_bp = Blueprint('patients', __name__)

_data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
_prototype_patients_path = os.path.join(_data_dir, 'sample_patients.json')
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


def _load_patients():
    """Load prototype and real patients while preserving both datasets."""
    prototype_patients = _safe_load_json(_prototype_patients_path)
    real_patients = _safe_load_json(_real_patients_path)

    for patient in prototype_patients:
        patient.setdefault('source', 'prototype')
    for patient in real_patients:
        patient.setdefault('source', 'real')

    return prototype_patients + real_patients


def _load_real_patients():
    return _safe_load_json(_real_patients_path)


def _load_checkups():
    return _safe_load_json(_checkups_path)


def _normalize_patient_id(patient_id):
    return str(patient_id).strip().upper()


def _normalize_doctor_id(doctor_id):
    return str(doctor_id).strip().upper()


def _generate_checkup_id(checkups):
    max_id = 9000
    for checkup in checkups:
        cid = str(checkup.get('id', ''))
        if cid.startswith('CHK-') and cid[4:].isdigit():
            max_id = max(max_id, int(cid[4:]))
    return f'CHK-{max_id + 1}'


def _sync_real_patient_from_checkup(checkup):
    patient_id = _normalize_patient_id(checkup.get('patient_id', ''))
    if not patient_id.startswith('P-'):
        return

    real_patients = _load_real_patients()
    updated = False
    for patient in real_patients:
        if _normalize_patient_id(patient.get('id', '')) != patient_id:
            continue

        patient['last_visit'] = checkup.get('date', datetime.now().strftime('%Y-%m-%d'))
        patient['vitals'] = {
            **patient.get('vitals', {}),
            **(checkup.get('vitals', {}) or {})
        }
        updated = True
        break

    if updated:
        _safe_write_json(_real_patients_path, real_patients)


@patients_bp.route('', methods=['GET'])
def get_patients():
    """Get list of all patients."""
    patients = _load_patients()
    return jsonify({
        'success': True,
        'patients': patients,
        'total': len(patients)
    })


@patients_bp.route('/<patient_id>', methods=['GET'])
def get_patient(patient_id):
    """Get single patient details."""
    patients = _load_patients()
    normalized_id = _normalize_patient_id(patient_id)
    patient = next((p for p in patients if _normalize_patient_id(p.get('id', '')) == normalized_id), None)

    if not patient:
        return jsonify({'error': 'Patient not found'}), 404

    checkups = [
        c for c in _load_checkups()
        if _normalize_patient_id(c.get('patient_id', '')) == normalized_id
    ]
    checkups.sort(key=lambda c: c.get('date', ''), reverse=True)

    return jsonify({
        'success': True,
        'patient': {
            **patient,
            'checkups': checkups,
            'checkup_count': len(checkups)
        }
    })


@patients_bp.route('', methods=['POST'])
def create_patient():
    """Create a new real patient record (prototype records stay unchanged)."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Patient data required'}), 400

    real_patients = _load_real_patients()
    numeric_ids = []
    for patient in real_patients:
        pid = str(patient.get('id', ''))
        if pid.startswith('P-') and pid[2:].isdigit():
            numeric_ids.append(int(pid[2:]))

    new_id = f"P-{(max(numeric_ids) + 1) if numeric_ids else 2004}"
    now_date = datetime.now().strftime('%Y-%m-%d')

    patient = {
        'id': new_id,
        'name': data.get('name', 'Unknown'),
        'email': data.get('email', ''),
        'role': 'patient',
        'age': data.get('age', 0),
        'gender': data.get('gender', 'Unknown'),
        'phone': data.get('phone', data.get('contact', '')),
        'blood_group': data.get('blood_group', 'Unknown'),
        'conditions': data.get('conditions', []),
        'status': 'active',
        'risk_level': 'low',
        'last_visit': data.get('last_visit', now_date),
        'vitals': data.get('vitals', {
            'heart_rate': 72,
            'blood_pressure': '120/80',
            'spo2': 98,
            'temperature': 98.6,
            'respiration_rate': 16,
            'blood_glucose': 95
        }),
        'ai_results': data.get('ai_results', {
            'pain_score': 0,
            'voice_condition': 'healthy',
            'surgery_risk': 'low',
            'health_score': 90
        }),
        'appointments': data.get('appointments', []),
        'medications': data.get('medications', []),
        'source': 'real'
    }

    real_patients.append(patient)

    try:
        _safe_write_json(_real_patients_path, real_patients)
    except Exception:
        pass

    return jsonify({
        'success': True,
        'patient': patient
    }), 201


@patients_bp.route('/<patient_id>', methods=['DELETE'])
def delete_patient(patient_id):
    """Delete a real patient record; prototype records are immutable."""
    normalized_id = _normalize_patient_id(patient_id)

    prototype_patients = _safe_load_json(_prototype_patients_path)
    if any(_normalize_patient_id(p.get('id', '')) == normalized_id for p in prototype_patients):
        return jsonify({'error': 'Prototype patient records cannot be deleted'}), 400

    real_patients = _load_real_patients()
    patient = next((p for p in real_patients if _normalize_patient_id(p.get('id', '')) == normalized_id), None)

    if not patient:
        return jsonify({'error': 'Patient not found'}), 404

    real_patients = [p for p in real_patients if _normalize_patient_id(p.get('id', '')) != normalized_id]

    try:
        _safe_write_json(_real_patients_path, real_patients)
    except Exception:
        pass

    return jsonify({
        'success': True,
        'message': f'Patient {patient_id} deleted'
    })


@patients_bp.route('/checkups/<patient_id>', methods=['GET'])
def get_patient_checkups(patient_id):
    """Get checkup history for a patient ID."""
    normalized_id = _normalize_patient_id(patient_id)
    checkups = [
        c for c in _load_checkups()
        if _normalize_patient_id(c.get('patient_id', '')) == normalized_id
    ]
    checkups.sort(key=lambda c: c.get('date', ''), reverse=True)
    return jsonify({'success': True, 'patient_id': patient_id, 'checkups': checkups, 'total': len(checkups)})


@patients_bp.route('/checkups/recent', methods=['GET'])
def get_recent_checkups():
    """Get recent real checkup records for doctor dashboards."""
    limit_param = request.args.get('limit', '10')
    try:
        limit = max(1, min(100, int(limit_param)))
    except ValueError:
        limit = 10

    checkups = sorted(_load_checkups(), key=lambda c: c.get('date', ''), reverse=True)
    return jsonify({'success': True, 'checkups': checkups[:limit], 'total': len(checkups)})


@patients_bp.route('/checkups', methods=['POST'])
def create_checkup():
    """Create a new checkup record for a patient."""
    data = request.get_json() or {}

    patient_id = _normalize_patient_id(data.get('patient_id', ''))
    doctor_id = _normalize_doctor_id(data.get('doctor_id', ''))
    doctor_name = str(data.get('doctor_name', '')).strip()
    checkup_date = str(data.get('date', datetime.now().strftime('%Y-%m-%d'))).strip()
    checkup_type = str(data.get('type', '')).strip()

    if not patient_id:
        return jsonify({'success': False, 'error': 'patient_id is required'}), 400
    if not doctor_name:
        return jsonify({'success': False, 'error': 'doctor_name is required'}), 400
    if not checkup_type:
        return jsonify({'success': False, 'error': 'type is required'}), 400

    checkups = _load_checkups()
    new_checkup = {
        'id': _generate_checkup_id(checkups),
        'patient_id': patient_id,
        'doctor_id': doctor_id or 'UNKNOWN',
        'doctor_name': doctor_name,
        'department': str(data.get('department', 'General Medicine')).strip() or 'General Medicine',
        'date': checkup_date,
        'type': checkup_type,
        'chief_complaint': str(data.get('chief_complaint', '')).strip(),
        'vitals': data.get('vitals', {}) or {},
        'diagnosis': str(data.get('diagnosis', '')).strip(),
        'assessment': str(data.get('assessment', 'Moderate risk')).strip(),
        'plan': str(data.get('plan', '')).strip(),
        'follow_up_in_days': int(data.get('follow_up_in_days', 14) or 14),
        'created_at': datetime.now().isoformat(),
    }

    checkups.append(new_checkup)
    _safe_write_json(_checkups_path, checkups)
    _sync_real_patient_from_checkup(new_checkup)

    return jsonify({'success': True, 'checkup': new_checkup}), 201
