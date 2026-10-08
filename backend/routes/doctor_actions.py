"""
Doctor actions routes - Override AI predictions, add manual diagnosis,
prescriptions, and health notes.
"""

from datetime import datetime
from flask import Blueprint, request, jsonify

from utils.logger import system_logger
from utils.notifications import notification_service

doctor_actions_bp = Blueprint('doctor_actions', __name__)

# In-memory store for doctor overrides and notes
_doctor_overrides = []
_override_counter = 0


@doctor_actions_bp.route('/override', methods=['POST'])
def override_ai_prediction():
    """Allow doctor to override AI prediction with manual diagnosis."""
    global _override_counter
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Override data required'}), 400

    doctor_id = data.get('doctor_id', 'unknown')
    patient_id = data.get('patient_id', 'unknown')
    action_type = data.get('action_type', 'override')  # override, approve, modify

    _override_counter += 1
    override = {
        'id': _override_counter,
        'doctor_id': doctor_id,
        'doctor_name': data.get('doctor_name', 'Unknown Doctor'),
        'patient_id': patient_id,
        'action_type': action_type,
        'timestamp': datetime.now().isoformat(),

        # AI original results
        'ai_diagnosis': data.get('ai_diagnosis', {}),
        'ai_confidence': data.get('ai_confidence', 0),

        # Doctor's input
        'doctor_diagnosis': data.get('doctor_diagnosis', ''),
        'doctor_notes': data.get('doctor_notes', ''),
        'prescription': data.get('prescription', ''),
        'follow_up': data.get('follow_up', ''),

        # Override metadata
        'reason': data.get('reason', ''),
        'status': 'active',
    }
    _doctor_overrides.append(override)

    # Log the action
    system_logger.log_doctor_action(
        doctor_id=doctor_id,
        action=f'AI prediction {action_type}',
        patient_id=patient_id,
        details={
            'action_type': action_type,
            'ai_diagnosis': data.get('ai_diagnosis', {}),
            'doctor_diagnosis': data.get('doctor_diagnosis', ''),
            'reason': data.get('reason', ''),
        }
    )

    # Notify patient of doctor's diagnosis
    if data.get('doctor_diagnosis'):
        notification_service.send_doctor_message(
            patient_id=patient_id,
            doctor_name=data.get('doctor_name', 'Your Doctor'),
            message=f"New diagnosis: {data['doctor_diagnosis']}. {data.get('doctor_notes', '')}"
        )

    return jsonify({
        'success': True,
        'override': override,
        'message': f'AI prediction {action_type}d successfully',
    }), 201


@doctor_actions_bp.route('/prescribe', methods=['POST'])
def add_prescription():
    """Add a prescription for a patient."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Prescription data required'}), 400

    prescription = {
        'id': len(_doctor_overrides) + 1,
        'doctor_id': data.get('doctor_id', 'unknown'),
        'doctor_name': data.get('doctor_name', 'Unknown Doctor'),
        'patient_id': data.get('patient_id', 'unknown'),
        'medication': data.get('medication', ''),
        'dosage': data.get('dosage', ''),
        'frequency': data.get('frequency', ''),
        'duration': data.get('duration', ''),
        'notes': data.get('notes', ''),
        'timestamp': datetime.now().isoformat(),
        'status': 'active',
    }

    system_logger.log_doctor_action(
        doctor_id=prescription['doctor_id'],
        action='Prescription added',
        patient_id=prescription['patient_id'],
        details={'medication': prescription['medication'], 'dosage': prescription['dosage']}
    )

    notification_service.send(
        recipient_id=prescription['patient_id'],
        recipient_role='patient',
        notification_type='prescription',
        title='New Prescription',
        message=f"{prescription['medication']} - {prescription['dosage']} ({prescription['frequency']})",
        data=prescription
    )

    return jsonify({'success': True, 'prescription': prescription}), 201


@doctor_actions_bp.route('/notes', methods=['POST'])
def add_health_notes():
    """Add health notes for a patient."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Note data required'}), 400

    note = {
        'doctor_id': data.get('doctor_id', 'unknown'),
        'doctor_name': data.get('doctor_name', 'Unknown Doctor'),
        'patient_id': data.get('patient_id', 'unknown'),
        'note': data.get('note', ''),
        'category': data.get('category', 'general'),  # general, diagnosis, observation
        'timestamp': datetime.now().isoformat(),
    }

    system_logger.log_doctor_action(
        doctor_id=note['doctor_id'],
        action='Health note added',
        patient_id=note['patient_id'],
        details={'category': note['category']}
    )

    return jsonify({'success': True, 'note': note}), 201


@doctor_actions_bp.route('/overrides/<patient_id>', methods=['GET'])
def get_overrides(patient_id):
    """Get all doctor overrides for a patient."""
    overrides = [o for o in _doctor_overrides if o['patient_id'] == str(patient_id)]
    return jsonify({
        'success': True,
        'overrides': list(reversed(overrides)),
        'total': len(overrides),
    })


@doctor_actions_bp.route('/approve-ai', methods=['POST'])
def approve_ai_result():
    """Doctor approves AI prediction result."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Data required'}), 400

    return override_ai_prediction_internal({
        **data,
        'action_type': 'approve',
        'doctor_diagnosis': data.get('ai_diagnosis', {}).get('primary_condition', 'Approved'),
        'reason': 'AI prediction confirmed by doctor',
    })


def override_ai_prediction_internal(data):
    """Internal helper for creating overrides."""
    global _override_counter
    _override_counter += 1

    override = {
        'id': _override_counter,
        'doctor_id': data.get('doctor_id', 'unknown'),
        'doctor_name': data.get('doctor_name', 'Unknown Doctor'),
        'patient_id': data.get('patient_id', 'unknown'),
        'action_type': data.get('action_type', 'approve'),
        'timestamp': datetime.now().isoformat(),
        'ai_diagnosis': data.get('ai_diagnosis', {}),
        'doctor_diagnosis': data.get('doctor_diagnosis', ''),
        'doctor_notes': data.get('doctor_notes', ''),
        'reason': data.get('reason', ''),
        'status': 'active',
    }
    _doctor_overrides.append(override)

    system_logger.log_doctor_action(
        doctor_id=override['doctor_id'],
        action=f"AI result {override['action_type']}d",
        patient_id=override['patient_id'],
    )

    return jsonify({'success': True, 'override': override}), 201
