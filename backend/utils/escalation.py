"""
Automatic Doctor Escalation System.
Escalates critical cases to doctors based on severity levels.

Level 1: Warning notification to patient
Level 2: Alert sent to doctor dashboard
Level 3: Emergency escalation to all available doctors
"""

import time
from datetime import datetime
from threading import Lock

from utils.logger import system_logger
from utils.notifications import notification_service


class EscalationService:
    """Handles automatic escalation of critical health conditions to doctors."""

    ESCALATION_LEVELS = {
        1: {
            'name': 'Warning',
            'description': 'Warning notification sent to patient',
            'color': '#F59E0B',
            'actions': ['notify_patient'],
        },
        2: {
            'name': 'Doctor Alert',
            'description': 'Alert sent to assigned doctor dashboard',
            'color': '#F97316',
            'actions': ['notify_patient', 'notify_doctor'],
        },
        3: {
            'name': 'Emergency',
            'description': 'Emergency escalation to all available doctors',
            'color': '#EF4444',
            'actions': ['notify_patient', 'notify_all_doctors', 'log_emergency'],
        },
    }

    def __init__(self):
        self._escalations = []
        self._lock = Lock()
        self._counter = 0

    def evaluate_and_escalate(self, patient_id, health_data):
        """Evaluate health data and determine escalation level."""
        vitals = health_data.get('vitals', {})
        ai_risk = health_data.get('risk_score', 0)
        emergency_flags = health_data.get('emergency_flags', [])

        # Determine escalation level
        level = self._determine_level(vitals, ai_risk, emergency_flags)

        if level == 0:
            return None  # No escalation needed

        return self._create_escalation(patient_id, level, health_data)

    def _determine_level(self, vitals, ai_risk, emergency_flags):
        """Determine escalation level based on health indicators."""
        hr = vitals.get('heart_rate', 72)
        systolic = vitals.get('systolic_bp', 120)
        diastolic = vitals.get('diastolic_bp', 80)
        temp = vitals.get('temperature', 98.6)
        spo2 = vitals.get('spo2', 98)

        # Level 3: Emergency conditions
        if emergency_flags:
            return 3
        if hr > 150 or hr < 35:
            return 3
        if systolic > 200 or systolic < 70:
            return 3
        if temp > 104 or temp < 94:
            return 3
        if spo2 < 88:
            return 3
        if ai_risk > 85:
            return 3

        # Level 2: Doctor alert conditions
        if hr > 120 or hr < 45:
            return 2
        if systolic > 170 or systolic < 85:
            return 2
        if temp > 102:
            return 2
        if spo2 < 92:
            return 2
        if ai_risk > 70:
            return 2

        # Level 1: Warning conditions
        if hr > 100 or hr < 55:
            return 1
        if systolic > 140:
            return 1
        if temp > 100.4:
            return 1
        if spo2 < 95:
            return 1
        if ai_risk > 50:
            return 1

        return 0

    def _create_escalation(self, patient_id, level, health_data):
        """Create an escalation record and trigger appropriate notifications."""
        with self._lock:
            self._counter += 1
            level_info = self.ESCALATION_LEVELS[level]

            escalation = {
                'id': self._counter,
                'patient_id': patient_id,
                'level': level,
                'level_info': level_info,
                'health_data': health_data,
                'status': 'active',
                'timestamp': datetime.now().isoformat(),
                'epoch': time.time(),
                'acknowledged_by': None,
                'resolution': None,
            }
            self._escalations.append(escalation)

            # Keep last 1000 escalations
            if len(self._escalations) > 1000:
                self._escalations = self._escalations[-1000:]

        # Execute escalation actions
        self._execute_actions(escalation)

        # Log the escalation
        system_logger.log_escalation(
            patient_id=patient_id,
            level=level,
            details={
                'vitals': health_data.get('vitals', {}),
                'risk_score': health_data.get('risk_score', 0),
            }
        )

        return escalation

    def _execute_actions(self, escalation):
        """Execute escalation actions based on level."""
        level = escalation['level']
        patient_id = escalation['patient_id']
        health_data = escalation['health_data']
        vitals = health_data.get('vitals', {})

        condition_summary = self._build_condition_summary(health_data)

        if level >= 1:
            notification_service.send(
                recipient_id=patient_id,
                recipient_role='patient',
                notification_type='health_alert',
                title='Health Warning',
                message=condition_summary,
                data={'escalation_level': level, 'vitals': vitals}
            )

        if level >= 2:
            notification_service.send(
                recipient_id='all_doctors',
                recipient_role='doctor',
                notification_type='escalation',
                title=f'Patient {patient_id} - Level {level} Escalation',
                message=condition_summary,
                data={
                    'patient_id': patient_id,
                    'escalation_level': level,
                    'vitals': vitals,
                    'risk_analysis': health_data.get('risk_analysis', {}),
                }
            )

        if level >= 3:
            notification_service.send_emergency_alert(
                patient_id=patient_id,
                condition=condition_summary,
                vitals=vitals,
                risk_analysis=health_data.get('risk_analysis', {})
            )
            system_logger.log_emergency(patient_id, condition_summary, vitals)

    def _build_condition_summary(self, health_data):
        """Build a human-readable condition summary."""
        concerns = []
        vitals = health_data.get('vitals', {})
        hr = vitals.get('heart_rate', 72)
        systolic = vitals.get('systolic_bp', 120)
        temp = vitals.get('temperature', 98.6)
        spo2 = vitals.get('spo2', 98)

        if hr > 100:
            concerns.append(f'Elevated heart rate ({hr} BPM)')
        elif hr < 55:
            concerns.append(f'Low heart rate ({hr} BPM)')
        if systolic > 140:
            concerns.append(f'High blood pressure ({systolic} mmHg)')
        elif systolic < 90:
            concerns.append(f'Low blood pressure ({systolic} mmHg)')
        if temp > 100.4:
            concerns.append(f'Fever ({temp}°F)')
        if spo2 < 95:
            concerns.append(f'Low oxygen saturation ({spo2}%)')

        if health_data.get('emergency_flags'):
            concerns.extend(health_data['emergency_flags'])

        return '; '.join(concerns) if concerns else 'Abnormal health indicators detected'

    def get_escalations(self, patient_id=None, level=None, status=None, limit=50):
        """Get escalation records with optional filters."""
        filtered = self._escalations
        if patient_id:
            filtered = [e for e in filtered if e['patient_id'] == str(patient_id)]
        if level:
            filtered = [e for e in filtered if e['level'] == level]
        if status:
            filtered = [e for e in filtered if e['status'] == status]
        return list(reversed(filtered))[:limit]

    def acknowledge_escalation(self, escalation_id, doctor_id):
        """Doctor acknowledges an escalation."""
        for e in self._escalations:
            if e['id'] == escalation_id:
                e['acknowledged_by'] = doctor_id
                e['status'] = 'acknowledged'
                system_logger.log_doctor_action(
                    doctor_id=doctor_id,
                    action=f'Acknowledged escalation #{escalation_id}',
                    patient_id=e['patient_id'],
                    details={'escalation_level': e['level']}
                )
                return e
        return None

    def resolve_escalation(self, escalation_id, doctor_id, resolution):
        """Doctor resolves an escalation."""
        for e in self._escalations:
            if e['id'] == escalation_id:
                e['status'] = 'resolved'
                e['resolution'] = resolution
                e['resolved_by'] = doctor_id
                e['resolved_at'] = datetime.now().isoformat()
                system_logger.log_doctor_action(
                    doctor_id=doctor_id,
                    action=f'Resolved escalation #{escalation_id}',
                    patient_id=e['patient_id'],
                    details={'resolution': resolution}
                )
                return e
        return None


# Singleton
escalation_service = EscalationService()
