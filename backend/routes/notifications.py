"""
Notification routes for managing notifications across dashboards.
"""

from flask import Blueprint, request, jsonify
from utils.notifications import notification_service

notifications_bp = Blueprint('notifications', __name__)


@notifications_bp.route('', methods=['GET'])
def get_notifications():
    """Get notifications for a user."""
    user_id = request.args.get('user_id', '')
    role = request.args.get('role', 'patient')
    unread_only = request.args.get('unread_only', 'false').lower() == 'true'
    limit = request.args.get('limit', 50, type=int)

    notifications = notification_service.get_notifications(
        recipient_id=user_id,
        recipient_role=role,
        unread_only=unread_only,
        limit=limit
    )

    unread_count = notification_service.get_unread_count(user_id, role)

    return jsonify({
        'success': True,
        'notifications': notifications,
        'total': len(notifications),
        'unread_count': unread_count,
    })


@notifications_bp.route('/read/<int:notification_id>', methods=['POST'])
def mark_read(notification_id):
    """Mark a notification as read."""
    data = request.get_json() or {}
    user_id = data.get('user_id', '')

    success = notification_service.mark_read(notification_id, user_id)
    return jsonify({'success': success})


@notifications_bp.route('/read-all', methods=['POST'])
def mark_all_read():
    """Mark all notifications as read for a user."""
    data = request.get_json() or {}
    user_id = data.get('user_id', '')
    role = data.get('role', 'patient')

    count = notification_service.mark_all_read(user_id, role)
    return jsonify({'success': True, 'marked_read': count})


@notifications_bp.route('/send', methods=['POST'])
def send_notification():
    """Send a notification (for doctor messages, etc.)."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Notification data required'}), 400

    notification = notification_service.send(
        recipient_id=data.get('recipient_id', ''),
        recipient_role=data.get('recipient_role', 'patient'),
        notification_type=data.get('type', 'system'),
        title=data.get('title', ''),
        message=data.get('message', ''),
        data=data.get('data', {})
    )

    return jsonify({'success': True, 'notification': notification}), 201


@notifications_bp.route('/unread-count', methods=['GET'])
def get_unread_count():
    """Get unread notification count."""
    user_id = request.args.get('user_id', '')
    role = request.args.get('role', 'patient')

    count = notification_service.get_unread_count(user_id, role)
    return jsonify({'success': True, 'unread_count': count})
