"""
Emergency Detection System.
Monitors vital signals in real time to detect emergency conditions
such as extremely high/low heart rate, dangerous BP levels,
high fever, and sudden collapse indicators.
"""

import time
from datetime import datetime

from utils.logger import system_logger
from utils.notifications import notification_service
from utils.escalation import escalation_service


class EmergencyDetector:
    """AI-powered emergency detection from vital signals."""

    # Emergency thresholds
    THRESHOLDS = {
        'heart_rate': {
            'critical_high': 150,
            'critical_low': 35,
            'danger_high': 130,
            'danger_low': 40,
            'warning_high': 110,
            'warning_low': 50,
        },
        'systolic_bp': {
            'critical_high': 200,
            'critical_low': 70,
            'danger_high': 180,
            'danger_low': 80,
            'warning_high': 160,
            'warning_low': 90,
        },
        'diastolic_bp': {
            'critical_high': 120,
            'critical_low': 40,
            'danger_high': 110,
            'danger_low': 50,
            'warning_high': 100,
            'warning_low': 55,
        },
        'temperature': {
            'critical_high': 104.0,
            'critical_low': 94.0,
            'danger_high': 103.0,
            'danger_low': 95.0,
            'warning_high': 101.0,
            'warning_low': 96.0,
        },
        'spo2': {
            'critical_low': 85,
            'danger_low': 90,
            'warning_low': 94,
        },
    }

    # Collapse detection parameters
    COLLAPSE_INDICATORS = {
        'sudden_hr_drop': 30,       # BPM drop within reading
        'sudden_activity_drop': 80,  # % drop in activity
        'zero_movement_minutes': 10, # minutes of no movement
    }

    def evaluate(self, vitals, patient_id=None, previous_vitals=None):
        """Evaluate vital signs for emergency conditions.

        Returns emergency assessment with severity, flags, and recommended actions.
        """
        emergency_flags = []
        severity = 'normal'
        confidence_score = 100.0
        actions = []

        hr = vitals.get('heart_rate', 72)
        systolic = vitals.get('systolic_bp', 120)
        diastolic = vitals.get('diastolic_bp', 80)
        temp = vitals.get('temperature', 98.6)
        spo2 = vitals.get('spo2', 98)
        activity = vitals.get('activity_level', None)

        # Parse blood pressure string if provided
        bp_str = vitals.get('blood_pressure', '')
        if bp_str and '/' in str(bp_str):
            try:
                parts = str(bp_str).split('/')
                systolic = int(parts[0])
                diastolic = int(parts[1])
            except (ValueError, IndexError):
                pass

        # --- Heart Rate Analysis ---
        hr_result = self._check_vital('heart_rate', hr)
        if hr_result:
            emergency_flags.append(hr_result)
            if hr_result['severity'] == 'critical':
                severity = 'critical'
                actions.append('Immediate cardiac monitoring required')
            elif hr_result['severity'] == 'danger' and severity != 'critical':
                severity = 'danger'
                actions.append('Urgent cardiac evaluation needed')

        # --- Blood Pressure Analysis ---
        bp_sys_result = self._check_vital('systolic_bp', systolic)
        bp_dia_result = self._check_vital('diastolic_bp', diastolic)
        if bp_sys_result:
            emergency_flags.append(bp_sys_result)
            if bp_sys_result['severity'] == 'critical':
                severity = 'critical'
                actions.append('Hypertensive/hypotensive emergency - immediate intervention')
        if bp_dia_result:
            emergency_flags.append(bp_dia_result)

        # --- Temperature Analysis ---
        temp_result = self._check_vital('temperature', temp)
        if temp_result:
            emergency_flags.append(temp_result)
            if temp_result['severity'] == 'critical':
                severity = 'critical'
                actions.append('Critical temperature - immediate cooling/warming measures')

        # --- SpO2 Analysis ---
        spo2_result = self._check_vital_low_only('spo2', spo2)
        if spo2_result:
            emergency_flags.append(spo2_result)
            if spo2_result['severity'] == 'critical':
                severity = 'critical'
                actions.append('Severely low oxygen - immediate supplemental oxygen')

        # --- Collapse Detection ---
        if previous_vitals:
            collapse = self._detect_collapse(vitals, previous_vitals)
            if collapse:
                emergency_flags.append(collapse)
                severity = 'critical'
                actions.append('Possible collapse detected - emergency response required')

        # Activity-based collapse detection
        if activity is not None and activity == 0:
            steps = vitals.get('steps', None)
            if steps is not None and steps == 0:
                emergency_flags.append({
                    'type': 'inactivity',
                    'severity': 'warning',
                    'message': 'Extended inactivity detected - check on patient',
                    'value': 0,
                })
                if severity == 'normal':
                    severity = 'warning'

        # Calculate confidence based on data completeness
        data_points = sum(1 for v in [hr, systolic, temp, spo2] if v is not None)
        confidence_score = round((data_points / 4) * 100, 1)

        is_emergency = severity in ('critical', 'danger')

        result = {
            'is_emergency': is_emergency,
            'severity': severity,
            'emergency_flags': emergency_flags,
            'actions': actions,
            'confidence': confidence_score,
            'timestamp': datetime.now().isoformat(),
            'vitals_analyzed': {
                'heart_rate': hr,
                'systolic_bp': systolic,
                'diastolic_bp': diastolic,
                'temperature': temp,
                'spo2': spo2,
            }
        }

        # Trigger alerts and escalation for emergencies
        if is_emergency and patient_id:
            flag_messages = [f['message'] for f in emergency_flags]
            condition = '; '.join(flag_messages)

            notification_service.send_emergency_alert(
                patient_id=patient_id,
                condition=condition,
                vitals=vitals,
                risk_analysis=result
            )

            escalation_service.evaluate_and_escalate(
                patient_id=patient_id,
                health_data={
                    'vitals': vitals,
                    'risk_score': 90 if severity == 'critical' else 75,
                    'emergency_flags': flag_messages,
                    'risk_analysis': result,
                }
            )

            system_logger.log_emergency(patient_id, condition, vitals)

        return result

    def _check_vital(self, vital_name, value):
        """Check a vital sign against thresholds."""
        thresholds = self.THRESHOLDS.get(vital_name, {})
        display_name = vital_name.replace('_', ' ').title()

        if 'critical_high' in thresholds and value >= thresholds['critical_high']:
            return {'type': vital_name, 'severity': 'critical', 'message': f'Critically high {display_name}: {value}', 'value': value}
        if 'critical_low' in thresholds and value <= thresholds['critical_low']:
            return {'type': vital_name, 'severity': 'critical', 'message': f'Critically low {display_name}: {value}', 'value': value}
        if 'danger_high' in thresholds and value >= thresholds['danger_high']:
            return {'type': vital_name, 'severity': 'danger', 'message': f'Dangerously high {display_name}: {value}', 'value': value}
        if 'danger_low' in thresholds and value <= thresholds['danger_low']:
            return {'type': vital_name, 'severity': 'danger', 'message': f'Dangerously low {display_name}: {value}', 'value': value}
        if 'warning_high' in thresholds and value >= thresholds['warning_high']:
            return {'type': vital_name, 'severity': 'warning', 'message': f'Elevated {display_name}: {value}', 'value': value}
        if 'warning_low' in thresholds and value <= thresholds['warning_low']:
            return {'type': vital_name, 'severity': 'warning', 'message': f'Low {display_name}: {value}', 'value': value}
        return None

    def _check_vital_low_only(self, vital_name, value):
        """Check vital sign against low thresholds only (e.g., SpO2)."""
        thresholds = self.THRESHOLDS.get(vital_name, {})
        display_name = vital_name.replace('_', ' ').upper()

        if 'critical_low' in thresholds and value <= thresholds['critical_low']:
            return {'type': vital_name, 'severity': 'critical', 'message': f'Critically low {display_name}: {value}%', 'value': value}
        if 'danger_low' in thresholds and value <= thresholds['danger_low']:
            return {'type': vital_name, 'severity': 'danger', 'message': f'Dangerously low {display_name}: {value}%', 'value': value}
        if 'warning_low' in thresholds and value <= thresholds['warning_low']:
            return {'type': vital_name, 'severity': 'warning', 'message': f'Low {display_name}: {value}%', 'value': value}
        return None

    def _detect_collapse(self, current_vitals, previous_vitals):
        """Detect potential collapse from vital sign changes."""
        prev_hr = previous_vitals.get('heart_rate', 72)
        curr_hr = current_vitals.get('heart_rate', 72)
        hr_drop = prev_hr - curr_hr

        if hr_drop >= self.COLLAPSE_INDICATORS['sudden_hr_drop']:
            return {
                'type': 'collapse_indicator',
                'severity': 'critical',
                'message': f'Sudden heart rate drop detected ({prev_hr} → {curr_hr} BPM)',
                'value': hr_drop,
            }

        prev_activity = previous_vitals.get('activity_level', 50)
        curr_activity = current_vitals.get('activity_level', 50)
        if prev_activity > 0:
            activity_drop_pct = ((prev_activity - curr_activity) / prev_activity) * 100
            if activity_drop_pct >= self.COLLAPSE_INDICATORS['sudden_activity_drop']:
                return {
                    'type': 'collapse_indicator',
                    'severity': 'critical',
                    'message': f'Sudden activity drop detected ({activity_drop_pct:.0f}% decrease)',
                    'value': activity_drop_pct,
                }

        return None


# Singleton
emergency_detector = EmergencyDetector()
