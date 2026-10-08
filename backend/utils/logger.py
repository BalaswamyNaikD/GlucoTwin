"""
Logging system for tracking AI predictions, doctor actions,
patient health alerts, and system events for auditing and debugging.
"""

import json
import os
import time
from datetime import datetime
from threading import Lock


class SystemLogger:
    """Centralized logging for all system activities."""

    LOG_TYPES = {
        'ai_prediction': 'AI Prediction',
        'doctor_action': 'Doctor Action',
        'health_alert': 'Health Alert',
        'emergency': 'Emergency',
        'auth': 'Authentication',
        'system': 'System Event',
        'notification': 'Notification',
        'escalation': 'Escalation',
    }

    def __init__(self, log_dir=None):
        self._logs = []
        self._lock = Lock()
        self._log_counter = 0
        self._log_dir = log_dir or os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs')
        os.makedirs(self._log_dir, exist_ok=True)

    def log(self, log_type, action, details=None, user_id=None, patient_id=None, severity='info'):
        """Record a system log entry."""
        with self._lock:
            self._log_counter += 1
            entry = {
                'id': self._log_counter,
                'timestamp': datetime.now().isoformat(),
                'epoch': time.time(),
                'type': log_type,
                'type_label': self.LOG_TYPES.get(log_type, log_type),
                'action': action,
                'details': details or {},
                'user_id': user_id,
                'patient_id': patient_id,
                'severity': severity,
            }
            self._logs.append(entry)

            # Keep last 10000 logs in memory
            if len(self._logs) > 10000:
                self._logs = self._logs[-10000:]

            # Write to file
            self._write_to_file(entry)
            return entry

    def log_ai_prediction(self, module, patient_id, prediction, confidence, user_id=None):
        """Log an AI prediction event."""
        return self.log(
            log_type='ai_prediction',
            action=f'{module} prediction completed',
            details={
                'module': module,
                'prediction': prediction,
                'confidence': confidence,
            },
            user_id=user_id,
            patient_id=patient_id,
            severity='info'
        )

    def log_doctor_action(self, doctor_id, action, patient_id=None, details=None):
        """Log a doctor action."""
        return self.log(
            log_type='doctor_action',
            action=action,
            details=details or {},
            user_id=doctor_id,
            patient_id=patient_id,
            severity='info'
        )

    def log_health_alert(self, patient_id, alert_level, message, vitals=None):
        """Log a health alert."""
        severity_map = {'critical': 'critical', 'warning': 'warning', 'info': 'info'}
        return self.log(
            log_type='health_alert',
            action=message,
            details={'vitals': vitals or {}, 'alert_level': alert_level},
            patient_id=patient_id,
            severity=severity_map.get(alert_level, 'info')
        )

    def log_emergency(self, patient_id, condition, vitals=None):
        """Log an emergency event."""
        return self.log(
            log_type='emergency',
            action=f'Emergency detected: {condition}',
            details={'condition': condition, 'vitals': vitals or {}},
            patient_id=patient_id,
            severity='critical'
        )

    def log_escalation(self, patient_id, level, doctor_id=None, details=None):
        """Log an escalation event."""
        return self.log(
            log_type='escalation',
            action=f'Case escalated to level {level}',
            details={'escalation_level': level, **(details or {})},
            user_id=doctor_id,
            patient_id=patient_id,
            severity='critical' if level >= 3 else 'warning'
        )

    def get_logs(self, log_type=None, patient_id=None, severity=None, limit=100, offset=0):
        """Retrieve logs with optional filters."""
        filtered = self._logs
        if log_type:
            filtered = [l for l in filtered if l['type'] == log_type]
        if patient_id:
            filtered = [l for l in filtered if l['patient_id'] == str(patient_id)]
        if severity:
            filtered = [l for l in filtered if l['severity'] == severity]

        # Return newest first
        filtered = list(reversed(filtered))
        total = len(filtered)
        return {
            'logs': filtered[offset:offset + limit],
            'total': total,
            'limit': limit,
            'offset': offset,
        }

    def _write_to_file(self, entry):
        """Persist log entry to daily log file."""
        try:
            date_str = datetime.now().strftime('%Y-%m-%d')
            filepath = os.path.join(self._log_dir, f'{date_str}.jsonl')
            with open(filepath, 'a') as f:
                f.write(json.dumps(entry) + '\n')
        except Exception:
            pass  # Don't let logging failures crash the system


# Singleton
system_logger = SystemLogger()
