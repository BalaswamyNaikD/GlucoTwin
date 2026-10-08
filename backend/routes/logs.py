"""
System logs routes for auditing and debugging.
"""

from flask import Blueprint, request, jsonify
from utils.logger import system_logger

logs_bp = Blueprint('logs', __name__)


@logs_bp.route('', methods=['GET'])
def get_logs():
    """Get system logs with optional filters."""
    log_type = request.args.get('type')
    patient_id = request.args.get('patient_id')
    severity = request.args.get('severity')
    limit = request.args.get('limit', 100, type=int)
    offset = request.args.get('offset', 0, type=int)

    result = system_logger.get_logs(
        log_type=log_type,
        patient_id=patient_id,
        severity=severity,
        limit=limit,
        offset=offset,
    )

    return jsonify({
        'success': True,
        **result,
    })


@logs_bp.route('/types', methods=['GET'])
def get_log_types():
    """Get available log types."""
    return jsonify({
        'success': True,
        'types': system_logger.LOG_TYPES,
    })
