from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
import json
import os

appointments_bp = Blueprint('appointments', __name__)

APPOINTMENTS_FILE = os.path.join(os.path.dirname(__file__), '../data/appointments.json')

def load_appointments():
    """Load appointments from file"""
    if not os.path.exists(APPOINTMENTS_FILE):
        return []
    try:
        with open(APPOINTMENTS_FILE, 'r') as f:
            return json.load(f)
    except:
        return []

def save_appointments(appointments):
    """Save appointments to file"""
    os.makedirs(os.path.dirname(APPOINTMENTS_FILE), exist_ok=True)
    with open(APPOINTMENTS_FILE, 'w') as f:
        json.dump(appointments, f, indent=2)

@appointments_bp.route('/appointments', methods=['GET'])
def get_appointments():
    """Get all appointments with optional filters"""
    try:
        appointments = load_appointments()
        
        # Filter by patient_id if provided
        patient_id = request.args.get('patient_id')
        if patient_id:
            appointments = [a for a in appointments if a.get('patient_id') == patient_id]
        
        # Filter by doctor_id if provided
        doctor_id = request.args.get('doctor_id')
        if doctor_id:
            appointments = [a for a in appointments if a.get('doctor_id') == doctor_id]
        
        # Filter by status if provided
        status = request.args.get('status')
        if status:
            appointments = [a for a in appointments if a.get('status') == status]
        
        return jsonify({
            'success': True,
            'appointments': appointments,
            'total': len(appointments)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@appointments_bp.route('/appointments', methods=['POST'])
def create_appointment():
    """Create a new appointment"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['patient_id', 'doctor_id', 'date', 'time', 'type']
        if not all(field in data for field in required_fields):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        appointments = load_appointments()
        
        # Create appointment object
        appointment = {
            'id': f"APT-{datetime.now().timestamp()}",
            'patient_id': data['patient_id'],
            'doctor_id': data['doctor_id'],
            'doctor_name': data.get('doctor_name', ''),
            'date': data['date'],
            'time': data['time'],
            'type': data['type'],
            'description': data.get('description', ''),
            'status': 'scheduled',
            'created_at': datetime.now().isoformat(),
            'notes': data.get('notes', '')
        }
        
        appointments.append(appointment)
        save_appointments(appointments)
        
        return jsonify({
            'success': True,
            'message': 'Appointment created successfully',
            'appointment': appointment
        }), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@appointments_bp.route('/appointments/<appointment_id>', methods=['GET'])
def get_appointment(appointment_id):
    """Get a specific appointment"""
    try:
        appointments = load_appointments()
        appointment = next((a for a in appointments if a.get('id') == appointment_id), None)
        
        if not appointment:
            return jsonify({'success': False, 'error': 'Appointment not found'}), 404
        
        return jsonify({
            'success': True,
            'appointment': appointment
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@appointments_bp.route('/appointments/<appointment_id>', methods=['PUT'])
def update_appointment(appointment_id):
    """Update an appointment"""
    try:
        data = request.get_json()
        appointments = load_appointments()
        
        appointment_idx = next((i for i, a in enumerate(appointments) if a.get('id') == appointment_id), None)
        if appointment_idx is None:
            return jsonify({'success': False, 'error': 'Appointment not found'}), 404
        
        # Update fields
        appointment = appointments[appointment_idx]
        for key in ['date', 'time', 'type', 'status', 'notes', 'description']:
            if key in data:
                appointment[key] = data[key]
        
        appointment['updated_at'] = datetime.now().isoformat()
        appointments[appointment_idx] = appointment
        save_appointments(appointments)
        
        return jsonify({
            'success': True,
            'message': 'Appointment updated successfully',
            'appointment': appointment
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@appointments_bp.route('/appointments/<appointment_id>', methods=['DELETE'])
def delete_appointment(appointment_id):
    """Delete an appointment"""
    try:
        appointments = load_appointments()
        appointments = [a for a in appointments if a.get('id') != appointment_id]
        save_appointments(appointments)
        
        return jsonify({
            'success': True,
            'message': 'Appointment deleted successfully'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@appointments_bp.route('/appointments/<appointment_id>/status', methods=['PATCH'])
def update_appointment_status(appointment_id):
    """Update appointment status (scheduled, completed, cancelled, rescheduled)"""
    try:
        data = request.get_json()
        status = data.get('status')
        
        if status not in ['scheduled', 'completed', 'cancelled', 'rescheduled', 'no-show']:
            return jsonify({'success': False, 'error': 'Invalid status'}), 400
        
        appointments = load_appointments()
        appointment_idx = next((i for i, a in enumerate(appointments) if a.get('id') == appointment_id), None)
        
        if appointment_idx is None:
            return jsonify({'success': False, 'error': 'Appointment not found'}), 404
        
        appointment = appointments[appointment_idx]
        appointment['status'] = status
        appointment['updated_at'] = datetime.now().isoformat()
        
        if status == 'completed':
            appointment['completed_at'] = datetime.now().isoformat()
        
        appointments[appointment_idx] = appointment
        save_appointments(appointments)
        
        return jsonify({
            'success': True,
            'message': f'Appointment marked as {status}',
            'appointment': appointment
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@appointments_bp.route('/appointments/availability', methods=['GET'])
def get_appointment_availability():
    """Get available time slots for doctor on a specific date"""
    try:
        doctor_id = request.args.get('doctor_id')
        date = request.args.get('date')
        
        if not doctor_id or not date:
            return jsonify({'success': False, 'error': 'doctor_id and date are required'}), 400
        
        # Load existing appointments for that doctor on that date
        appointments = load_appointments()
        booked_slots = [a.get('time') for a in appointments 
                       if a.get('doctor_id') == doctor_id and a.get('date') == date and a.get('status') != 'cancelled']
        
        # Define time slots (9 AM to 5 PM, 30-min intervals)
        all_slots = []
        start_hour = 9
        end_hour = 17
        for hour in range(start_hour, end_hour):
            for minute in [0, 30]:
                time_str = f"{hour:02d}:{minute:02d}"
                all_slots.append({
                    'time': time_str,
                    'available': time_str not in booked_slots
                })
        
        return jsonify({
            'success': True,
            'date': date,
            'doctor_id': doctor_id,
            'slots': all_slots,
            'available_count': len([s for s in all_slots if s['available']])
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
