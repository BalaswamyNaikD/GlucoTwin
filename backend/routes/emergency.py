"""
Emergency detection and escalation routes.
"""

from flask import Blueprint, request, jsonify
from models.emergency_detector import emergency_detector
from utils.escalation import escalation_service
from utils.logger import system_logger

emergency_bp = Blueprint('emergency', __name__)


@emergency_bp.route('/evaluate', methods=['POST'])
def evaluate_emergency():
    """Evaluate vital signs for emergency conditions."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Vitals data required'}), 400

    patient_id = data.get('patient_id')
    vitals = data.get('vitals', {})
    previous_vitals = data.get('previous_vitals')

    result = emergency_detector.evaluate(
        vitals=vitals,
        patient_id=patient_id,
        previous_vitals=previous_vitals,
    )

    return jsonify({
        'success': True,
        'evaluation': result,
    })


@emergency_bp.route('/escalations', methods=['GET'])
def get_escalations():
    """Get escalation records."""
    patient_id = request.args.get('patient_id')
    level = request.args.get('level', type=int)
    status = request.args.get('status')
    limit = request.args.get('limit', 50, type=int)

    escalations = escalation_service.get_escalations(
        patient_id=patient_id,
        level=level,
        status=status,
        limit=limit,
    )

    return jsonify({
        'success': True,
        'escalations': escalations,
        'total': len(escalations),
    })


@emergency_bp.route('/escalations/<int:escalation_id>/acknowledge', methods=['POST'])
def acknowledge_escalation(escalation_id):
    """Doctor acknowledges an escalation."""
    data = request.get_json() or {}
    doctor_id = data.get('doctor_id', 'unknown')

    result = escalation_service.acknowledge_escalation(escalation_id, doctor_id)
    if result:
        return jsonify({'success': True, 'escalation': result})
    return jsonify({'error': 'Escalation not found'}), 404


@emergency_bp.route('/escalations/<int:escalation_id>/resolve', methods=['POST'])
def resolve_escalation(escalation_id):
    """Doctor resolves an escalation."""
    data = request.get_json() or {}
    doctor_id = data.get('doctor_id', 'unknown')
    resolution = data.get('resolution', '')

    result = escalation_service.resolve_escalation(escalation_id, doctor_id, resolution)
    if result:
        return jsonify({'success': True, 'escalation': result})
    return jsonify({'error': 'Escalation not found'}), 404
