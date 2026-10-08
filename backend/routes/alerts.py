"""
Real-time health alerts routes.
Monitors wearable data and generates alerts for abnormal signals.
"""

import random
import time
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify

from models.emergency_detector import emergency_detector
from models.smartwatch_validator import smartwatch_validator
from utils.logger import system_logger
from utils.notifications import notification_service
from utils.escalation import escalation_service

alerts_bp = Blueprint('alerts', __name__)

# In-memory store for real-time vitals
_patient_vitals_history = {}


@alerts_bp.route('/monitor', methods=['POST'])
def monitor_vitals():
    """Receive and monitor wearable data in real-time.
    Generates alerts if abnormal signals are detected."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Vitals data required'}), 400

    patient_id = str(data.get('patient_id', 'unknown'))
    vitals = data.get('vitals', {})

    # Get previous vitals for comparison
    previous = _patient_vitals_history.get(patient_id, {}).get('latest')

    # Store current reading
    if patient_id not in _patient_vitals_history:
        _patient_vitals_history[patient_id] = {'history': [], 'latest': None}
    reading = {**vitals, 'timestamp': datetime.now().isoformat()}
    _patient_vitals_history[patient_id]['history'].append(reading)
    _patient_vitals_history[patient_id]['latest'] = vitals

    # Keep last 100 readings per patient
    if len(_patient_vitals_history[patient_id]['history']) > 100:
        _patient_vitals_history[patient_id]['history'] = _patient_vitals_history[patient_id]['history'][-100:]

    # Validate smartwatch data
    validation = smartwatch_validator.validate(vitals, previous)

    # Check for emergencies
    emergency = emergency_detector.evaluate(vitals, patient_id=patient_id, previous_vitals=previous)

    # Generate alerts for anomalies
    alerts = []
    for anomaly in validation.get('anomalies', []):
        alert = {
            'patient_id': patient_id,
            'level': anomaly['severity'],
            'module': 'Wearable Monitor',
            'message': anomaly['message'],
            'timestamp': datetime.now().isoformat(),
        }
        alerts.append(alert)

        # Send notifications for critical/warning anomalies
        if anomaly['severity'] in ('critical', 'warning'):
            notification_service.send_health_alert(
                patient_id=patient_id,
                title=f"Health Alert: {anomaly['metric'].replace('_', ' ').title()}",
                message=anomaly['message'],
                vitals=vitals
            )
            system_logger.log_health_alert(
                patient_id=patient_id,
                alert_level=anomaly['severity'],
                message=anomaly['message'],
                vitals=vitals
            )

    # Trigger escalation for critical cases
    if validation.get('has_critical') or emergency.get('is_emergency'):
        escalation_service.evaluate_and_escalate(
            patient_id=patient_id,
            health_data={
                'vitals': vitals,
                'risk_score': 80 if emergency.get('is_emergency') else 60,
                'emergency_flags': [f['message'] for f in emergency.get('emergency_flags', [])],
            }
        )

    return jsonify({
        'success': True,
        'patient_id': patient_id,
        'validation': validation,
        'emergency': emergency,
        'alerts_generated': len(alerts),
        'alerts': alerts,
    })


@alerts_bp.route('/realtime', methods=['GET'])
def get_realtime_alerts():
    """Get real-time alerts for dashboards."""
    patient_id = request.args.get('patient_id')
    role = request.args.get('role', 'doctor')

    # Get active alerts from simulated + real data
    alerts = _generate_realtime_alerts(patient_id)

    return jsonify({
        'success': True,
        'alerts': alerts,
        'total': len(alerts),
        'critical_count': sum(1 for a in alerts if a['level'] == 'critical'),
        'warning_count': sum(1 for a in alerts if a['level'] == 'warning'),
    })


@alerts_bp.route('/history/<patient_id>', methods=['GET'])
def get_vitals_history(patient_id):
    """Get vitals history for a patient."""
    history = _patient_vitals_history.get(patient_id, {}).get('history', [])

    return jsonify({
        'success': True,
        'patient_id': patient_id,
        'history': history,
        'total_readings': len(history),
    })


def _generate_realtime_alerts(patient_id=None):
    """Generate simulated real-time alerts for demo purposes."""
    alerts = [
        {
            'id': 1,
            'level': 'critical',
            'module': 'Wearable Monitor',
            'patient': 'John Doe (P-1000)',
            'patient_id': 'P-1000',
            'message': 'Heart rate spike detected: 142 BPM (normal: 60-100)',
            'time': '2 min ago',
            'type': 'heart_rate_spike',
            'acknowledged': False,
        },
        {
            'id': 2,
            'level': 'warning',
            'module': 'Wearable Monitor',
            'patient': 'Robert Brown (P-1003)',
            'patient_id': 'P-1003',
            'message': 'Blood pressure elevated: 165/100 mmHg',
            'time': '8 min ago',
            'type': 'bp_elevated',
            'acknowledged': False,
        },
        {
            'id': 3,
            'level': 'critical',
            'module': 'Emergency Detection',
            'patient': 'John Doe (P-1000)',
            'patient_id': 'P-1000',
            'message': 'Fever detected: 101.8°F — immediate attention required',
            'time': '12 min ago',
            'type': 'fever',
            'acknowledged': False,
        },
        {
            'id': 4,
            'level': 'warning',
            'module': 'Wearable Monitor',
            'patient': 'David Anderson (P-1007)',
            'patient_id': 'P-1007',
            'message': 'Long inactivity period: no movement for 45 minutes',
            'time': '20 min ago',
            'type': 'inactivity',
            'acknowledged': True,
        },
        {
            'id': 5,
            'level': 'info',
            'module': 'Wearable Monitor',
            'patient': 'Emily Davis (P-1004)',
            'patient_id': 'P-1004',
            'message': 'Sleep pattern irregular: only 4.2 hours last night',
            'time': '35 min ago',
            'type': 'sleep_pattern',
            'acknowledged': True,
        },
    ]

    if patient_id:
        alerts = [a for a in alerts if a.get('patient_id') == patient_id]

    return alerts
