"""
Notification service for sending critical health alerts,
appointment reminders, and doctor messages to dashboards.
"""

import time
from datetime import datetime
from threading import Lock


class NotificationService:
    """Manages notifications for patients and doctors."""

    NOTIFICATION_TYPES = {
        'health_alert': {'icon': '🚨', 'color': '#EF4444', 'priority': 1},
        'emergency': {'icon': '🆘', 'color': '#DC2626', 'priority': 0},
        'appointment_reminder': {'icon': '📅', 'color': '#3B82F6', 'priority': 3},
        'doctor_message': {'icon': '💬', 'color': '#8B5CF6', 'priority': 2},
        'ai_result': {'icon': '🤖', 'color': '#06B6D4', 'priority': 3},
        'prescription': {'icon': '💊', 'color': '#10B981', 'priority': 2},
        'escalation': {'icon': '⬆️', 'color': '#F97316', 'priority': 1},
        'system': {'icon': 'ℹ️', 'color': '#6B7280', 'priority': 4},
    }

    def __init__(self):
        self._notifications = []
        self._lock = Lock()
        self._counter = 0

    def send(self, recipient_id, recipient_role, notification_type, title, message, data=None):
        """Create and store a notification."""
        with self._lock:
            self._counter += 1
            type_info = self.NOTIFICATION_TYPES.get(notification_type, self.NOTIFICATION_TYPES['system'])
            notification = {
                'id': self._counter,
                'recipient_id': recipient_id,
                'recipient_role': recipient_role,
                'type': notification_type,
                'title': title,
                'message': message,
                'data': data or {},
                'icon': type_info['icon'],
                'color': type_info['color'],
                'priority': type_info['priority'],
                'read': False,
                'timestamp': datetime.now().isoformat(),
                'epoch': time.time(),
            }
            self._notifications.append(notification)

            # Keep last 5000 notifications
            if len(self._notifications) > 5000:
                self._notifications = self._notifications[-5000:]

            return notification

    def send_health_alert(self, patient_id, title, message, vitals=None):
        """Send health alert to both patient and all doctors."""
        notifications = []
        # Notify patient
        notifications.append(self.send(
            recipient_id=patient_id,
            recipient_role='patient',
            notification_type='health_alert',
            title=title,
            message=message,
            data={'vitals': vitals or {}}
        ))
        # Notify all doctors (broadcast)
        notifications.append(self.send(
            recipient_id='all_doctors',
            recipient_role='doctor',
            notification_type='health_alert',
            title=f'[Patient {patient_id}] {title}',
            message=message,
            data={'patient_id': patient_id, 'vitals': vitals or {}}
        ))
        return notifications

    def send_emergency_alert(self, patient_id, condition, vitals=None, risk_analysis=None):
        """Send emergency alert to patient and all available doctors."""
        notifications = []
        notifications.append(self.send(
            recipient_id=patient_id,
            recipient_role='patient',
            notification_type='emergency',
            title='Emergency Condition Detected',
            message=f'Critical condition: {condition}. Seek immediate medical attention.',
            data={'vitals': vitals or {}, 'condition': condition}
        ))
        notifications.append(self.send(
            recipient_id='all_doctors',
            recipient_role='doctor',
            notification_type='emergency',
            title=f'EMERGENCY: Patient {patient_id}',
            message=f'Critical condition detected: {condition}',
            data={
                'patient_id': patient_id,
                'condition': condition,
                'vitals': vitals or {},
                'risk_analysis': risk_analysis or {}
            }
        ))
        return notifications

    def send_appointment_reminder(self, patient_id, appointment_data):
        """Send appointment reminder to patient."""
        return self.send(
            recipient_id=patient_id,
            recipient_role='patient',
            notification_type='appointment_reminder',
            title='Appointment Reminder',
            message=f"Upcoming appointment with {appointment_data.get('doctor', 'your doctor')} on {appointment_data.get('date', 'soon')}",
            data=appointment_data
        )

    def send_doctor_message(self, patient_id, doctor_name, message):
        """Send a message from doctor to patient."""
        return self.send(
            recipient_id=patient_id,
            recipient_role='patient',
            notification_type='doctor_message',
            title=f'Message from {doctor_name}',
            message=message,
            data={'doctor_name': doctor_name}
        )

    def get_notifications(self, recipient_id, recipient_role=None, unread_only=False, limit=50):
        """Get notifications for a specific recipient."""
        filtered = [
            n for n in self._notifications
            if (n['recipient_id'] == recipient_id or n['recipient_id'] == f'all_{recipient_role}s')
        ]
        if recipient_role:
            filtered = [n for n in filtered if n['recipient_role'] == recipient_role]
        if unread_only:
            filtered = [n for n in filtered if not n['read']]

        # Sort by priority then timestamp (newest first)
        filtered.sort(key=lambda x: (x['priority'], -x['epoch']))
        return filtered[:limit]

    def mark_read(self, notification_id, recipient_id):
        """Mark a notification as read."""
        for n in self._notifications:
            if n['id'] == notification_id and (n['recipient_id'] == recipient_id or n['recipient_id'].startswith('all_')):
                n['read'] = True
                return True
        return False

    def mark_all_read(self, recipient_id, recipient_role=None):
        """Mark all notifications as read for a recipient."""
        count = 0
        for n in self._notifications:
            if (n['recipient_id'] == recipient_id or n['recipient_id'] == f'all_{recipient_role}s') and not n['read']:
                n['read'] = True
                count += 1
        return count

    def get_unread_count(self, recipient_id, recipient_role=None):
        """Get count of unread notifications."""
        return len([
            n for n in self._notifications
            if (n['recipient_id'] == recipient_id or n['recipient_id'] == f'all_{recipient_role}s')
            and n['recipient_role'] == (recipient_role or n['recipient_role'])
            and not n['read']
        ])


# Singleton
notification_service = NotificationService()
