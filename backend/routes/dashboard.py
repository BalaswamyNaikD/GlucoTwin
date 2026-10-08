"""Dashboard data routes for doctor monitoring."""

import json
import os
import random
from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request

dashboard_bp = Blueprint('dashboard', __name__)

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


def _load_all_patients():
    prototype = _safe_load_json(_prototype_patients_path)
    real = _safe_load_json(_real_patients_path)
    return prototype + real


def _load_checkups():
    return _safe_load_json(_checkups_path)


def _normalize_text(value):
    return str(value or '').strip().lower()


def _normalize_id(value):
    return str(value or '').strip().upper()


def _risk_value(risk_level):
    mapping = {'low': 1, 'medium': 2, 'high': 3}
    return mapping.get(str(risk_level).strip().lower(), 1)


def _build_health_trends_from_checkups(days=7, checkups=None):
    checkups = checkups if checkups is not None else _load_checkups()
    if not checkups:
        return _generate_health_trend(days)

    daily_buckets = {}
    for checkup in checkups:
        date_str = checkup.get('date')
        if not date_str:
            continue
        daily_buckets.setdefault(date_str, []).append(checkup)

    trends = []
    base_date = datetime.now()
    for i in range(days):
        date = base_date - timedelta(days=days - 1 - i)
        date_str = date.strftime('%Y-%m-%d')
        bucket = daily_buckets.get(date_str, [])

        if not bucket:
            trends.append({
                'date': date_str,
                'label': date.strftime('%b %d'),
                'heart_rate': random.randint(68, 86),
                'blood_pressure_systolic': random.randint(118, 138),
                'blood_pressure_diastolic': random.randint(72, 88),
                'spo2': random.randint(95, 99),
                'pain_score': random.randint(0, 4),
                'sleep_hours': round(random.uniform(6, 8.5), 1),
            })
            continue

        heart_rates = []
        systolic = []
        diastolic = []
        spo2 = []
        pain_scores = []
        for checkup in bucket:
            vitals = checkup.get('vitals', {})
            bp = str(vitals.get('blood_pressure', '120/80')).split('/')
            heart_rates.append(int(vitals.get('heart_rate', 0) or 0))
            systolic.append(int(bp[0]) if bp and str(bp[0]).isdigit() else 120)
            diastolic.append(int(bp[1]) if len(bp) > 1 and str(bp[1]).isdigit() else 80)
            spo2.append(int(vitals.get('spo2', 98) or 98))
            pain_scores.append(_risk_value(checkup.get('assessment', 'low')))

        trends.append({
            'date': date_str,
            'label': date.strftime('%b %d'),
            'heart_rate': round(sum(heart_rates) / max(len(heart_rates), 1)),
            'blood_pressure_systolic': round(sum(systolic) / max(len(systolic), 1)),
            'blood_pressure_diastolic': round(sum(diastolic) / max(len(diastolic), 1)),
            'spo2': round(sum(spo2) / max(len(spo2), 1)),
            'pain_score': round(sum(pain_scores) / max(len(pain_scores), 1), 1),
            'sleep_hours': round(random.uniform(6, 8.5), 1),
        })

    return trends


def _generate_health_trend(days=7):
    """Generate sample health trend data."""
    trends = []
    base_date = datetime.now()
    for i in range(days):
        date = base_date - timedelta(days=days - 1 - i)
        trends.append({
            'date': date.strftime('%Y-%m-%d'),
            'label': date.strftime('%b %d'),
            'heart_rate': random.randint(65, 90),
            'blood_pressure_systolic': random.randint(115, 140),
            'blood_pressure_diastolic': random.randint(70, 90),
            'spo2': random.randint(95, 100),
            'pain_score': random.randint(0, 4),
            'sleep_hours': round(random.uniform(5, 9), 1),
        })
    return trends


def _generate_empty_health_trend(days=7):
    """Generate empty trend rows for doctor-specific dashboards with no assigned records."""
    trends = []
    base_date = datetime.now()
    for i in range(days):
        date = base_date - timedelta(days=days - 1 - i)
        trends.append({
            'date': date.strftime('%Y-%m-%d'),
            'label': date.strftime('%b %d'),
            'heart_rate': 0,
            'blood_pressure_systolic': 0,
            'blood_pressure_diastolic': 0,
            'spo2': 0,
            'pain_score': 0,
            'sleep_hours': 0,
        })
    return trends


@dashboard_bp.route('/overview', methods=['GET'])
def get_overview():
    """Get dashboard overview data."""
    doctor_id = _normalize_id(request.args.get('doctor_id', ''))
    doctor_name = _normalize_text(request.args.get('doctor_name', ''))

    all_patients = _load_all_patients()
    all_checkups = sorted(_load_checkups(), key=lambda c: c.get('date', ''), reverse=True)

    if doctor_id or doctor_name:
        checkups = [
            c for c in all_checkups
            if (doctor_id and _normalize_id(c.get('doctor_id', '')) == doctor_id)
            or (doctor_name and _normalize_text(c.get('doctor_name', '')) == doctor_name)
        ]
    else:
        checkups = all_checkups

    assigned_patient_ids = {_normalize_id(c.get('patient_id', '')) for c in checkups}
    patients = []
    if doctor_id or doctor_name:
        for patient in all_patients:
            patient_id = _normalize_id(patient.get('id', ''))
            appointments = patient.get('appointments', [])
            has_matching_appointment = any(
                _normalize_text(apt.get('doctor', '')) == doctor_name
                for apt in appointments
            ) if doctor_name else False

            if patient_id in assigned_patient_ids or has_matching_appointment:
                patients.append(patient)
    else:
        patients = all_patients

    risk_levels = [str(p.get('risk_level', 'low')).lower() for p in patients]
    critical_patients = sum(1 for p in patients if str(p.get('status', '')).lower() == 'critical')
    monitoring_patients = sum(1 for p in patients if str(p.get('status', '')).lower() == 'monitoring')
    high_risk = sum(1 for r in risk_levels if r == 'high')

    recent_activity = []
    for checkup in checkups[:5]:
        recent_activity.append({
            'time': checkup.get('date', 'N/A'),
            'event': f"{checkup.get('type', 'Checkup')} completed",
            'patient': f"Patient {checkup.get('patient_id', 'Unknown')}",
            'severity': 'critical' if str(checkup.get('assessment', '')).lower() == 'high risk' else 'normal'
        })

    avg_pain = 0
    pain_values = [p.get('ai_results', {}).get('pain_score') for p in patients if p.get('ai_results')]
    pain_values = [v for v in pain_values if isinstance(v, (int, float))]
    if pain_values:
        avg_pain = round(sum(pain_values) / len(pain_values), 1)

    health_trends = (
        _generate_empty_health_trend(7)
        if (doctor_id or doctor_name) and not checkups
        else _build_health_trends_from_checkups(7, checkups=checkups)
    )

    return jsonify({
        'success': True,
        'stats': {
            'total_patients': len(patients),
            'active_monitoring': monitoring_patients,
            'critical_alerts': max(critical_patients, high_risk),
            'scans_today': len([c for c in checkups if c.get('date') == datetime.now().strftime('%Y-%m-%d')]),
            'ai_accuracy': 94.7,
            'avg_pain_score': avg_pain,
        },
        'recent_activity': recent_activity,
        'health_trends': health_trends,
        'recent_checkups': checkups[:10],
        'doctor_context': {
            'doctor_id': doctor_id or None,
            'doctor_name': doctor_name or None,
            'is_filtered': bool(doctor_id or doctor_name)
        }
    })


@dashboard_bp.route('/alerts', methods=['GET'])
def get_alerts():
    """Get real-time alert notifications."""
    alerts = [
        {
            'id': 1,
            'level': 'critical',
            'module': 'Pain Detection',
            'patient': 'John Doe (#1035)',
            'message': 'Severe pain level detected (Score: 8/10)',
            'time': '5 min ago',
            'acknowledged': False,
        },
        {
            'id': 2,
            'level': 'warning',
            'module': 'Voice Analysis',
            'patient': 'Jane Smith (#1038)',
            'message': "Possible Parkinson's disease indicators (67%)",
            'time': '18 min ago',
            'acknowledged': False,
        },
        {
            'id': 3,
            'level': 'critical',
            'module': 'Surgery Risk',
            'patient': 'Robert Brown (#1022)',
            'message': 'High surgical risk - multi-specialist evaluation required',
            'time': '45 min ago',
            'acknowledged': True,
        },
        {
            'id': 4,
            'level': 'warning',
            'module': 'Smartwatch',
            'patient': 'Emily Davis (#1041)',
            'message': 'Abnormal heart rate detected (112 BPM)',
            'time': '1 hr ago',
            'acknowledged': True,
        },
        {
            'id': 5,
            'level': 'info',
            'module': 'AI Engine',
            'patient': 'Michael Wilson (#1029)',
            'message': 'Mobile checkup completed - all metrics normal',
            'time': '2 hr ago',
            'acknowledged': True,
        },
    ]

    return jsonify({
        'success': True,
        'alerts': alerts,
        'unacknowledged': sum(1 for a in alerts if not a['acknowledged']),
    })


@dashboard_bp.route('/stats/weekly', methods=['GET'])
def get_weekly_stats():
    """Get weekly statistics for charts."""
    days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    return jsonify({
        'success': True,
        'scans_per_day': [random.randint(30, 60) for _ in days],
        'alerts_per_day': [random.randint(2, 10) for _ in days],
        'patients_per_day': [random.randint(15, 35) for _ in days],
        'labels': days,
        'disease_distribution': {
            'labels': ['Healthy', "Parkinson's", 'Respiratory', 'Depression', 'Other'],
            'values': [62, 12, 15, 8, 3],
        },
        'risk_distribution': {
            'labels': ['Low Risk', 'Medium Risk', 'High Risk'],
            'values': [58, 28, 14],
        }
    })
