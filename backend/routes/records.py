from flask import Blueprint, request, jsonify
from datetime import datetime
import json
import os

records_bp = Blueprint('records', __name__)

RECORDS_FILE = os.path.join(os.path.dirname(__file__), '../data/records.json')
PRESCRIPTIONS_FILE = os.path.join(os.path.dirname(__file__), '../data/prescriptions.json')

def load_records():
    """Load health records from file"""
    if not os.path.exists(RECORDS_FILE):
        return []
    try:
        with open(RECORDS_FILE, 'r') as f:
            return json.load(f)
    except:
        return []

def save_records(records):
    """Save health records to file"""
    os.makedirs(os.path.dirname(RECORDS_FILE), exist_ok=True)
    with open(RECORDS_FILE, 'w') as f:
        json.dump(records, f, indent=2)

def load_prescriptions():
    """Load prescriptions from file"""
    if not os.path.exists(PRESCRIPTIONS_FILE):
        return []
    try:
        with open(PRESCRIPTIONS_FILE, 'r') as f:
            return json.load(f)
    except:
        return []

def save_prescriptions(prescriptions):
    """Save prescriptions to file"""
    os.makedirs(os.path.dirname(PRESCRIPTIONS_FILE), exist_ok=True)
    with open(PRESCRIPTIONS_FILE, 'w') as f:
        json.dump(prescriptions, f, indent=2)

# ============ HEALTH RECORDS ============

@records_bp.route('/records', methods=['GET'])
def get_health_records():
    """Get health records for a patient"""
    try:
        patient_id = request.args.get('patient_id')
        if not patient_id:
            return jsonify({'success': False, 'error': 'patient_id is required'}), 400
        
        records = load_records()
        patient_records = [r for r in records if r.get('patient_id') == patient_id]
        
        # Sort by date descending
        patient_records = sorted(patient_records, key=lambda x: x.get('date', ''), reverse=True)
        
        return jsonify({
            'success': True,
            'records': patient_records,
            'total': len(patient_records)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@records_bp.route('/records', methods=['POST'])
def create_health_record():
    """Create a new health record"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['patient_id', 'record_type', 'title']
        if not all(field in data for field in required_fields):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        records = load_records()
        
        # Create record object
        record = {
            'id': f"REC-{datetime.now().timestamp()}",
            'patient_id': data['patient_id'],
            'record_type': data['record_type'],  # lab_report, imaging, checkup, diagnosis, procedure, vaccination
            'title': data['title'],
            'description': data.get('description', ''),
            'doctor_name': data.get('doctor_name', ''),
            'doctor_id': data.get('doctor_id', ''),
            'department': data.get('department', ''),
            'date': data.get('date', datetime.now().isoformat().split('T')[0]),
            'file_url': data.get('file_url', ''),
            'file_name': data.get('file_name', ''),
            'file_type': data.get('file_type', ''),  # pdf, jpg, png
            'findings': data.get('findings', ''),
            'recommendations': data.get('recommendations', ''),
            'normal_range': data.get('normal_range', ''),
            'test_results': data.get('test_results', {}),  # key:value pairs for lab values
            'status': 'active',
            'visibility': data.get('visibility', 'private'),  # private, shared_with_doctors
            'created_at': datetime.now().isoformat(),
            'tags': data.get('tags', [])
        }
        
        records.append(record)
        save_records(records)
        
        return jsonify({
            'success': True,
            'message': 'Health record created successfully',
            'record': record
        }), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@records_bp.route('/records/<record_id>', methods=['GET'])
def get_health_record(record_id):
    """Get a specific health record"""
    try:
        records = load_records()
        record = next((r for r in records if r.get('id') == record_id), None)
        
        if not record:
            return jsonify({'success': False, 'error': 'Record not found'}), 404
        
        return jsonify({
            'success': True,
            'record': record
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@records_bp.route('/records/<record_id>', methods=['PUT'])
def update_health_record(record_id):
    """Update a health record"""
    try:
        data = request.get_json()
        records = load_records()
        
        record_idx = next((i for i, r in enumerate(records) if r.get('id') == record_id), None)
        if record_idx is None:
            return jsonify({'success': False, 'error': 'Record not found'}), 404
        
        # Update fields
        record = records[record_idx]
        updateable_fields = ['title', 'description', 'findings', 'recommendations', 'tags', 'visibility']
        for key in updateable_fields:
            if key in data:
                record[key] = data[key]
        
        record['updated_at'] = datetime.now().isoformat()
        records[record_idx] = record
        save_records(records)
        
        return jsonify({
            'success': True,
            'message': 'Health record updated successfully',
            'record': record
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@records_bp.route('/records/<record_id>', methods=['DELETE'])
def delete_health_record(record_id):
    """Delete a health record"""
    try:
        records = load_records()
        records = [r for r in records if r.get('id') != record_id]
        save_records(records)
        
        return jsonify({
            'success': True,
            'message': 'Health record deleted successfully'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============ PRESCRIPTIONS (E-Prescription) ============

@records_bp.route('/prescriptions', methods=['GET'])
def get_prescriptions():
    """Get prescriptions for a patient"""
    try:
        patient_id = request.args.get('patient_id')
        if not patient_id:
            return jsonify({'success': False, 'error': 'patient_id is required'}), 400
        
        prescriptions = load_prescriptions()
        patient_prescriptions = [p for p in prescriptions if p.get('patient_id') == patient_id]
        
        # Filter by status if provided
        status = request.args.get('status')
        if status:
            patient_prescriptions = [p for p in patient_prescriptions if p.get('status') == status]
        
        # Sort by date descending
        patient_prescriptions = sorted(patient_prescriptions, key=lambda x: x.get('date', ''), reverse=True)
        
        return jsonify({
            'success': True,
            'prescriptions': patient_prescriptions,
            'total': len(patient_prescriptions)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@records_bp.route('/prescriptions', methods=['POST'])
def create_prescription():
    """Create a new prescription (doctor creates)"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['patient_id', 'doctor_id', 'medicines']
        if not all(field in data for field in required_fields):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        prescriptions = load_prescriptions()
        
        # Create prescription object
        prescription = {
            'id': f"PRESC-{datetime.now().timestamp()}",
            'patient_id': data['patient_id'],
            'patient_name': data.get('patient_name', ''),
            'doctor_id': data['doctor_id'],
            'doctor_name': data.get('doctor_name', ''),
            'date': datetime.now().isoformat().split('T')[0],
            'medicines': data['medicines'],  # List of {name, dosage, frequency, duration, timing, notes}
            'diagnosis': data.get('diagnosis', ''),
            'instructions': data.get('instructions', ''),
            'special_instructions': data.get('special_instructions', ''),
            'tests_required': data.get('tests_required', []),
            'follow_up_date': data.get('follow_up_date', ''),
            'valid_until': data.get('valid_until', ''),
            'status': 'active',  # active, expired, revoked
            'issued_date': datetime.now().isoformat(),
            'refills': data.get('refills', 0),
            'refills_remaining': data.get('refills', 0),
            'notes': data.get('notes', ''),
            'file_url': data.get('file_url', '')
        }
        
        prescriptions.append(prescription)
        save_prescriptions(prescriptions)
        
        return jsonify({
            'success': True,
            'message': 'Prescription created successfully',
            'prescription': prescription
        }), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@records_bp.route('/prescriptions/<prescription_id>', methods=['GET'])
def get_prescription(prescription_id):
    """Get a specific prescription"""
    try:
        prescriptions = load_prescriptions()
        prescription = next((p for p in prescriptions if p.get('id') == prescription_id), None)
        
        if not prescription:
            return jsonify({'success': False, 'error': 'Prescription not found'}), 404
        
        return jsonify({
            'success': True,
            'prescription': prescription
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@records_bp.route('/prescriptions/<prescription_id>/refill', methods=['POST'])
def refill_prescription(prescription_id):
    """Request refill for a prescription"""
    try:
        prescriptions = load_prescriptions()
        prescription_idx = next((i for i, p in enumerate(prescriptions) if p.get('id') == prescription_id), None)
        
        if prescription_idx is None:
            return jsonify({'success': False, 'error': 'Prescription not found'}), 404
        
        prescription = prescriptions[prescription_idx]
        
        # Check refills remaining
        refills_remaining = prescription.get('refills_remaining', 0)
        if refills_remaining <= 0:
            return jsonify({'success': False, 'error': 'No refills remaining. Contact your doctor.'}), 400
        
        prescription['refills_remaining'] = refills_remaining - 1
        prescription['last_refill_date'] = datetime.now().isoformat()
        prescriptions[prescription_idx] = prescription
        save_prescriptions(prescriptions)
        
        return jsonify({
            'success': True,
            'message': 'Prescription refilled successfully',
            'prescription': prescription
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@records_bp.route('/prescriptions/<prescription_id>/download', methods=['GET'])
def download_prescription(prescription_id):
    """Get download link for prescription PDF"""
    try:
        prescriptions = load_prescriptions()
        prescription = next((p for p in prescriptions if p.get('id') == prescription_id), None)
        
        if not prescription:
            return jsonify({'success': False, 'error': 'Prescription not found'}), 404
        
        # Return file info
        return jsonify({
            'success': True,
            'prescription_id': prescription_id,
            'file_url': prescription.get('file_url', ''),
            'file_name': prescription.get('doctor_name', 'prescription') + '_' + prescription.get('date', '') + '.pdf'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@records_bp.route('/prescriptions/<prescription_id>/status', methods=['PATCH'])
def update_prescription_status(prescription_id):
    """Update prescription status (doctor only - active/revoked/expired)"""
    try:
        data = request.get_json()
        status = data.get('status')
        
        if status not in ['active', 'expired', 'revoked']:
            return jsonify({'success': False, 'error': 'Invalid status'}), 400
        
        prescriptions = load_prescriptions()
        prescription_idx = next((i for i, p in enumerate(prescriptions) if p.get('id') == prescription_id), None)
        
        if prescription_idx is None:
            return jsonify({'success': False, 'error': 'Prescription not found'}), 404
        
        prescription = prescriptions[prescription_idx]
        prescription['status'] = status
        prescriptions[prescription_idx] = prescription
        save_prescriptions(prescriptions)
        
        return jsonify({
            'success': True,
            'message': f'Prescription status updated to {status}',
            'prescription': prescription
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
