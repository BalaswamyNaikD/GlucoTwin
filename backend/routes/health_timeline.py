"""
Health History Timeline routes.
Provides historical health data for patient dashboards including:
- Past vital signs
- Pain detection history
- Voice analysis results
- AI predictions
- Doctor prescriptions
"""

import random
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify

health_timeline_bp = Blueprint('health_timeline', __name__)

# In-memory timeline store
_timeline_data = {}


def _generate_sample_timeline(patient_id):
    """Generate sample health timeline data for demonstration."""
    base_date = datetime.now()
    timeline = []

    # Generate 30 days of vital sign history
    vitals_history = []
    for i in range(30):
        date = base_date - timedelta(days=29 - i)
        vitals_history.append({
            'date': date.strftime('%Y-%m-%d'),
            'label': date.strftime('%b %d'),
            'heart_rate': random.randint(65, 95),
            'systolic_bp': random.randint(115, 155),
            'diastolic_bp': random.randint(70, 95),
            'spo2': random.randint(94, 100),
            'temperature': round(random.uniform(97.5, 100.5), 1),
            'sleep_hours': round(random.uniform(4.5, 9.0), 1),
            'steps': random.randint(2000, 12000),
        })

    # Pain detection history
    pain_history = []
    for i in range(10):
        date = base_date - timedelta(days=random.randint(0, 29))
        pain_history.append({
            'date': date.strftime('%Y-%m-%d'),
            'time': date.strftime('%H:%M'),
            'pain_score': random.randint(0, 8),
            'pain_label': ['No Pain', 'Mild', 'Mild', 'Moderate', 'Moderate', 'Moderate', 'Severe', 'Severe', 'Very Severe'][min(random.randint(0, 8), 8)],
            'confidence': random.randint(60, 95),
            'regions': random.choice(['Face', 'Eyes + Mouth', 'Brows + Eyes']),
        })
    pain_history.sort(key=lambda x: x['date'], reverse=True)

    # Voice analysis history
    voice_history = []
    conditions = ['healthy', 'healthy', 'respiratory', 'parkinsons', 'depression', 'healthy']
    for i in range(6):
        date = base_date - timedelta(days=i * 5)
        cond = conditions[i]
        voice_history.append({
            'date': date.strftime('%Y-%m-%d'),
            'condition': cond,
            'condition_name': {'healthy': 'Healthy', 'respiratory': 'Respiratory Disorder', 'parkinsons': "Parkinson's Disease", 'depression': 'Depression'}.get(cond, cond),
            'confidence': random.randint(55, 92),
            'risk_level': 'low' if cond == 'healthy' else random.choice(['medium', 'high']),
        })

    # AI prediction history
    ai_predictions = []
    for i in range(15):
        date = base_date - timedelta(days=i * 2)
        health_score = random.randint(45, 95)
        ai_predictions.append({
            'date': date.strftime('%Y-%m-%d'),
            'health_score': health_score,
            'risk_score': 100 - health_score,
            'status': 'Good' if health_score >= 80 else 'Fair' if health_score >= 60 else 'Concerning' if health_score >= 40 else 'Critical',
            'confidence': random.randint(70, 95),
            'modules_used': random.randint(2, 5),
        })

    # Doctor prescriptions / notes
    prescriptions = [
        {
            'date': (base_date - timedelta(days=2)).strftime('%Y-%m-%d'),
            'doctor': 'Dr. Sarah Johnson',
            'type': 'prescription',
            'title': 'Medication Update',
            'details': 'Amlodipine 5mg - Once daily for blood pressure management',
            'notes': 'Monitor BP weekly. Return if systolic > 150.',
        },
        {
            'date': (base_date - timedelta(days=7)).strftime('%Y-%m-%d'),
            'doctor': 'Dr. Michael Chen',
            'type': 'diagnosis',
            'title': 'Follow-up Examination',
            'details': 'Blood pressure stable. Continue current medication.',
            'notes': 'Patient reports improved sleep. Exercise recommended.',
        },
        {
            'date': (base_date - timedelta(days=14)).strftime('%Y-%m-%d'),
            'doctor': 'Dr. Sarah Johnson',
            'type': 'prescription',
            'title': 'New Prescription',
            'details': 'Aspirin 75mg - Once daily for cardiovascular protection',
            'notes': 'Take with food. Report any unusual bleeding.',
        },
        {
            'date': (base_date - timedelta(days=21)).strftime('%Y-%m-%d'),
            'doctor': 'Dr. Michael Chen',
            'type': 'lab_result',
            'title': 'Lab Results Review',
            'details': 'Cholesterol: 210 mg/dL (borderline). HbA1c: 6.2% (pre-diabetic range).',
            'notes': 'Dietary modifications recommended. Follow-up in 3 months.',
        },
    ]

    return {
        'vitals_history': vitals_history,
        'pain_history': pain_history,
        'voice_history': voice_history,
        'ai_predictions': ai_predictions,
        'prescriptions': prescriptions,
    }


@health_timeline_bp.route('/<patient_id>', methods=['GET'])
def get_timeline(patient_id):
    """Get complete health timeline for a patient."""
    days = request.args.get('days', 30, type=int)

    # Return stored timeline or generate sample data
    if patient_id not in _timeline_data:
        _timeline_data[patient_id] = _generate_sample_timeline(patient_id)

    timeline = _timeline_data[patient_id]

    return jsonify({
        'success': True,
        'patient_id': patient_id,
        'timeline': timeline,
        'period_days': days,
    })


@health_timeline_bp.route('/<patient_id>/vitals', methods=['GET'])
def get_vitals_timeline(patient_id):
    """Get vital signs history for charts."""
    days = request.args.get('days', 30, type=int)

    if patient_id not in _timeline_data:
        _timeline_data[patient_id] = _generate_sample_timeline(patient_id)

    vitals = _timeline_data[patient_id].get('vitals_history', [])
    if days < 30:
        vitals = vitals[-days:]

    return jsonify({
        'success': True,
        'patient_id': patient_id,
        'vitals_history': vitals,
        'total_records': len(vitals),
    })


@health_timeline_bp.route('/<patient_id>/predictions', methods=['GET'])
def get_predictions_timeline(patient_id):
    """Get AI prediction history."""
    if patient_id not in _timeline_data:
        _timeline_data[patient_id] = _generate_sample_timeline(patient_id)

    return jsonify({
        'success': True,
        'patient_id': patient_id,
        'predictions': _timeline_data[patient_id].get('ai_predictions', []),
    })


@health_timeline_bp.route('/<patient_id>/event', methods=['POST'])
def add_timeline_event(patient_id):
    """Add a new event to the patient timeline."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Event data required'}), 400

    if patient_id not in _timeline_data:
        _timeline_data[patient_id] = _generate_sample_timeline(patient_id)

    event_type = data.get('type', 'note')
    event = {
        'date': datetime.now().strftime('%Y-%m-%d'),
        'time': datetime.now().strftime('%H:%M'),
        **data,
    }

    # Add to appropriate history list
    if event_type == 'prescription':
        _timeline_data[patient_id]['prescriptions'].insert(0, event)
    elif event_type == 'pain_detection':
        _timeline_data[patient_id]['pain_history'].insert(0, event)
    elif event_type == 'voice_analysis':
        _timeline_data[patient_id]['voice_history'].insert(0, event)
    elif event_type == 'ai_prediction':
        _timeline_data[patient_id]['ai_predictions'].insert(0, event)

    return jsonify({'success': True, 'event': event}), 201
