from flask import Blueprint, request, jsonify
from datetime import datetime
import json
import os

reminders_bp = Blueprint('reminders', __name__)

REMINDERS_FILE = os.path.join(os.path.dirname(__file__), '../data/reminders.json')

WEEKDAY_NAMES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

def load_reminders():
    """Load reminders from file"""
    if not os.path.exists(REMINDERS_FILE):
        return []
    try:
        with open(REMINDERS_FILE, 'r') as f:
            return json.load(f)
    except:
        return []

def save_reminders(reminders):
    """Save reminders to file"""
    os.makedirs(os.path.dirname(REMINDERS_FILE), exist_ok=True)
    with open(REMINDERS_FILE, 'w') as f:
        json.dump(reminders, f, indent=2)

@reminders_bp.route('', methods=['GET'])
def get_reminders():
    """Get all reminders for a patient"""
    try:
        patient_id = str(request.args.get('patient_id', '')).strip()
        if not patient_id:
            return jsonify({'success': False, 'error': 'patient_id is required'}), 400
        
        reminders = load_reminders()
        patient_reminders = [r for r in reminders if str(r.get('patient_id', '')).strip() == patient_id]
        
        return jsonify({
            'success': True,
            'reminders': patient_reminders,
            'total': len(patient_reminders)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@reminders_bp.route('', methods=['POST'])
def create_reminder():
    """Create a new medicine reminder"""
    try:
        data = request.get_json(silent=True) or {}
        print(f"[reminders] create payload: {data}")
        
        # Validate required fields
        required_fields = ['patient_id', 'medicine_name', 'dosage', 'time']
        if not all(str(data.get(field, '')).strip() for field in required_fields):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        reminders = load_reminders()
        
        # Create reminder object
        reminder = {
            'id': f"REM-{datetime.now().timestamp()}",
            'patient_id': str(data['patient_id']).strip(),
            'medicine_name': data['medicine_name'],
            'dosage': data['dosage'],
            'time': data['time'],
            'frequency': data.get('frequency', 'daily'),  # daily, weekly, custom
            'days_of_week': data.get('days_of_week', []),  # For weekly reminders
            'instructions': data.get('instructions', ''),
            'status': 'active',
            'created_at': datetime.now().isoformat(),
            'start_date': data.get('start_date', datetime.now().isoformat().split('T')[0]),
            'end_date': data.get('end_date', ''),
            'notes': data.get('notes', ''),
            'taken_dates': []  # Track when reminder was marked as taken
        }
        
        reminders.append(reminder)
        save_reminders(reminders)
        print(f"[reminders] saved reminder id={reminder['id']} patient_id={reminder['patient_id']}")
        
        return jsonify({
            'success': True,
            'message': 'Reminder created successfully',
            'reminder': reminder
        }), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@reminders_bp.route('/<reminder_id>', methods=['GET'])
def get_reminder(reminder_id):
    """Get a specific reminder"""
    try:
        reminders = load_reminders()
        reminder = next((r for r in reminders if r.get('id') == reminder_id), None)
        
        if not reminder:
            return jsonify({'success': False, 'error': 'Reminder not found'}), 404
        
        return jsonify({
            'success': True,
            'reminder': reminder
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@reminders_bp.route('/<reminder_id>', methods=['PUT'])
def update_reminder(reminder_id):
    """Update a reminder"""
    try:
        data = request.get_json(silent=True) or {}
        reminders = load_reminders()
        
        reminder_idx = next((i for i, r in enumerate(reminders) if r.get('id') == reminder_id), None)
        if reminder_idx is None:
            return jsonify({'success': False, 'error': 'Reminder not found'}), 404
        
        # Update fields
        reminder = reminders[reminder_idx]
        for key in ['medicine_name', 'dosage', 'time', 'frequency', 'days_of_week', 'instructions', 'notes', 'status', 'end_date']:
            if key in data:
                reminder[key] = data[key]
        
        reminder['updated_at'] = datetime.now().isoformat()
        reminders[reminder_idx] = reminder
        save_reminders(reminders)
        
        return jsonify({
            'success': True,
            'message': 'Reminder updated successfully',
            'reminder': reminder
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@reminders_bp.route('/<reminder_id>', methods=['DELETE'])
def delete_reminder(reminder_id):
    """Delete a reminder"""
    try:
        reminders = load_reminders()
        reminders = [r for r in reminders if r.get('id') != reminder_id]
        save_reminders(reminders)
        
        return jsonify({
            'success': True,
            'message': 'Reminder deleted successfully'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@reminders_bp.route('/<reminder_id>/mark-taken', methods=['POST'])
def mark_reminder_taken(reminder_id):
    """Mark a reminder as taken today"""
    try:
        reminders = load_reminders()
        reminder_idx = next((i for i, r in enumerate(reminders) if r.get('id') == reminder_id), None)
        
        if reminder_idx is None:
            return jsonify({'success': False, 'error': 'Reminder not found'}), 404
        
        reminder = reminders[reminder_idx]
        today = datetime.now().isoformat().split('T')[0]
        
        if 'taken_dates' not in reminder:
            reminder['taken_dates'] = []
        
        if today not in reminder['taken_dates']:
            reminder['taken_dates'].append(today)
        
        reminders[reminder_idx] = reminder
        save_reminders(reminders)
        
        return jsonify({
            'success': True,
            'message': 'Reminder marked as taken',
            'reminder': reminder
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@reminders_bp.route('/today', methods=['GET'])
def get_todays_reminders():
    """Get all reminders for today for a patient"""
    try:
        patient_id = str(request.args.get('patient_id', '')).strip()
        if not patient_id:
            return jsonify({'success': False, 'error': 'patient_id is required'}), 400
        
        reminders = load_reminders()
        today = datetime.now().isoformat().split('T')[0]
        weekday = WEEKDAY_NAMES[datetime.now().weekday()]

        def is_active_for_today(reminder):
            if reminder.get('status') != 'active':
                return False

            start_date = str(reminder.get('start_date', '')).strip()
            end_date = str(reminder.get('end_date', '')).strip()
            if start_date and start_date > today:
                return False
            if end_date and end_date < today:
                return False

            frequency = str(reminder.get('frequency', 'daily')).strip().lower()
            if frequency == 'daily':
                return True
            if frequency == 'weekly':
                days = [str(d).strip().lower() for d in reminder.get('days_of_week', []) if str(d).strip()]
                if not days:
                    return True
                return weekday in days

            # custom frequency defaults to active date-range behavior
            return True
        
        # Filter active reminders for today
        todays_reminders = [
            r for r in reminders
            if str(r.get('patient_id', '')).strip() == patient_id and is_active_for_today(r)
        ]
        
        return jsonify({
            'success': True,
            'reminders': todays_reminders,
            'total': len(todays_reminders),
            'date': today
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
