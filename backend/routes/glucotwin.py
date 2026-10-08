from flask import Blueprint, jsonify

from glucotwin.service import GlucoTwinError, glucotwin_service


glucotwin_bp = Blueprint("glucotwin", __name__)


def _error_response(error: GlucoTwinError, status: int = 400):
    return jsonify({"success": False, "error": str(error)}), status


@glucotwin_bp.get("/patients")
def get_patients():
    try:
        return jsonify({"success": True, "patients": glucotwin_service.patients()})
    except GlucoTwinError as error:
        return _error_response(error, 503)


@glucotwin_bp.get("/live/<patient_id>")
def get_live_observation(patient_id):
    try:
        return jsonify({"success": True, "data": glucotwin_service.live(patient_id)})
    except GlucoTwinError as error:
        status = 404 if "not found" in str(error) else 400
        return _error_response(error, status)


@glucotwin_bp.post("/reset/<patient_id>")
def reset_simulation(patient_id):
    try:
        return jsonify({"success": True, "data": glucotwin_service.reset(patient_id)})
    except GlucoTwinError as error:
        status = 404 if "not found" in str(error) else 400
        return _error_response(error, status)


@glucotwin_bp.get("/metadata")
def get_metadata():
    try:
        return jsonify({"success": True, "data": glucotwin_service.metadata()})
    except GlucoTwinError as error:
        return _error_response(error, 503)
