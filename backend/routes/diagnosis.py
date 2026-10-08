"""
Diagnosis API routes for pain detection, voice analysis, and surgery risk.
All AI modules now output confidence scores.
"""

from flask import Blueprint, request, jsonify
from models.surgery_risk import surgery_risk_predictor
from models.ai_engine import ai_engine
from models.health_risk_engine import health_risk_engine
from models.smartwatch_validator import smartwatch_validator
from models.emergency_detector import emergency_detector
from utils.logger import system_logger
from utils.surgery_recommendations import (
    recommend_surgeries_for_patient,
    get_surgery_details,
    calculate_surgery_risk_increase,
    SURGERY_DATABASE
)

diagnosis_bp = Blueprint('diagnosis', __name__)


@diagnosis_bp.route('/pain-detection', methods=['POST'])
def analyze_pain():
    """Pain model removed from active system."""
    return jsonify({
        'success': False,
        'error': 'Pain detection model has been removed from this deployment.'
    }), 410


@diagnosis_bp.route('/voice-analysis', methods=['POST'])
def analyze_voice():
    """Voice model removed from active system."""
    return jsonify({
        'success': False,
        'error': 'Voice analysis model has been removed from this deployment.'
    }), 410


@diagnosis_bp.route('/surgery-risk', methods=['POST'])
def predict_surgery_risk():
    """Predict surgery risk based on patient parameters. Returns confidence score."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Patient data required'}), 400

    required_fields = ['age', 'systolic_bp', 'diastolic_bp', 'heart_rate']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400

    result = surgery_risk_predictor.predict(data)

    # Log AI prediction
    system_logger.log_ai_prediction(
        module='Surgery Risk',
        patient_id=data.get('patient_id', 'unknown'),
        prediction={'risk_level': result.get('risk_level'), 'risk_info': result.get('risk_info', {}).get('level')},
        confidence=result.get('confidence', 0),
    )

    return jsonify(result)


@diagnosis_bp.route('/mobile-checkup', methods=['POST'])
def mobile_checkup():
    """Combined mobile AI doctor checkup with confidence scores."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Checkup data required'}), 400

    smartwatch = None

    if 'smartwatch' in data:
        smartwatch = data['smartwatch']

    # Run AI decision engine (pain and voice models removed)
    combined = ai_engine.analyze(
        smartwatch_data=smartwatch
    )

    combined['pain_analysis'] = None
    combined['voice_analysis'] = None
    combined['smartwatch_data'] = smartwatch

    return jsonify(combined)


@diagnosis_bp.route('/ai-analysis', methods=['POST'])
def ai_analysis():
    """Run AI decision engine with provided module results."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Analysis data required'}), 400

    result = ai_engine.analyze(
        surgery_data=data.get('surgery'),
        smartwatch_data=data.get('smartwatch')
    )

    return jsonify(result)


@diagnosis_bp.route('/health-risk', methods=['POST'])
def health_risk_assessment():
    """Run comprehensive health risk assessment combining all AI modules."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Assessment data required'}), 400

    result = health_risk_engine.assess(
        patient_id=data.get('patient_id'),
        pain_data=None,
        voice_data=None,
        smartwatch_data=data.get('smartwatch'),
        medical_records=data.get('medical_records'),
        surgery_data=data.get('surgery'),
    )

    return jsonify(result)


@diagnosis_bp.route('/validate-wearable', methods=['POST'])
def validate_wearable():
    """Validate smartwatch/wearable data for anomalies."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Wearable data required'}), 400

    result = smartwatch_validator.validate(
        data=data.get('current', data),
        previous_data=data.get('previous'),
    )

    return jsonify({'success': True, 'validation': result})


@diagnosis_bp.route('/surgery-recommendations', methods=['POST'])
def surgery_recommendations():
    """Get AI-recommended surgeries based on patient conditions.
    
    Request body:
    {
        "conditions": ["Type 2 Diabetes", "Hypertension"],
        "temperature": 0.7  // Optional confidence threshold
    }
    """
    data = request.get_json()
    if not data or 'conditions' not in data:
        return jsonify({'error': 'Patient conditions required'}), 400
    
    conditions = data.get('conditions', [])
    temperature = data.get('temperature', 0.7)
    
    recommendations = recommend_surgeries_for_patient(conditions, temperature)
    
    return jsonify({
        'success': True,
        'recommendations': recommendations,
        'total_recommendations': len(recommendations)
    })


@diagnosis_bp.route('/surgery-details/<surgery_name>', methods=['GET'])
def get_surgery_info(surgery_name):
    """Get detailed information about a specific surgery including side-effects.
    
    Path parameter:
        surgery_name: Name of the surgery
    """
    surgery_info = get_surgery_details(surgery_name)
    
    if not surgery_info:
        return jsonify({'error': f'Surgery "{surgery_name}" not found'}), 404
    
    return jsonify({
        'success': True,
        'surgery_name': surgery_name,
        'details': surgery_info
    })


@diagnosis_bp.route('/all-surgeries', methods=['GET'])
def get_all_surgeries():
    """Get list of all available surgeries in the database."""
    surgeries = [
        {
            'name': name,
            'description': info.get('description', ''),
            'recovery_time': info.get('recovery_time', '')
        }
        for name, info in SURGERY_DATABASE.items()
    ]
    
    return jsonify({
        'success': True,
        'surgeries': surgeries,
        'total': len(surgeries)
    })


@diagnosis_bp.route('/surgery-risk-with-side-effects', methods=['POST'])
def predict_surgery_risk_with_side_effects():
    """Predict surgery risk and include side-effects for a specific surgery.
    
    Request body:
    {
        "age": 52,
        "systolic_bp": 130,
        "diastolic_bp": 84,
        "heart_rate": 80,
        "cholesterol": 210,
        "bmi": 27,
        "diabetes": true,
        "smoking": false,
        "previous_surgeries": 0,
        "comorbidity_count": 0,
        "surgery_name": "Kidney Replacement"  // Optional: specific surgery
    }
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Patient data required'}), 400

    required_fields = ['age', 'systolic_bp', 'diastolic_bp', 'heart_rate']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400

    # Get base risk prediction
    risk_result = surgery_risk_predictor.predict(data)
    
    # If specific surgery is provided, add surgery-specific risk increase
    surgery_name = data.get('surgery_name')
    if surgery_name:
        surgery_info = get_surgery_details(surgery_name)
        if surgery_info:
            additional_risk = calculate_surgery_risk_increase(data, surgery_name)
            
            # Adjust the risk level based on surgery-specific factors
            risk_result['surgery_specific_risk'] = {
                'surgery_name': surgery_name,
                'additional_risk_increase': additional_risk,
                'common_side_effects': surgery_info.get('common_side_effects', []),
                'serious_complications': surgery_info.get('serious_complications', []),
                'recovery_time': surgery_info.get('recovery_time', ''),
                'description': surgery_info.get('description', '')
            }
        else:
            risk_result['surgery_specific_risk'] = {
                'error': f'Surgery "{surgery_name}" not found'
            }
    
    # Log AI prediction
    system_logger.log_ai_prediction(
        module='Surgery Risk with Side-Effects',
        patient_id=data.get('patient_id', 'unknown'),
        prediction={
            'risk_level': risk_result.get('risk_level'),
            'risk_info': risk_result.get('risk_info', {}).get('level'),
            'surgery': surgery_name
        },
        confidence=risk_result.get('confidence', 0),
    )

    return jsonify(risk_result)

