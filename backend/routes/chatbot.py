"""
AI Medical Chatbot Route - Powered by Hugging Face Mistral-7B-Instruct
Provides intelligent medical conversation with context-aware responses using real AI.
"""

from flask import Blueprint, request, jsonify
from datetime import datetime
import random
import re
import os

try:
    from ..utils.huggingface_ai import generate_ai_response, generate_medical_ai_response, transcribe_audio_with_whisper
    from ..models.ai_engine import ai_engine
    from ..models.emergency_detector import emergency_detector
except ImportError:
    # Support running backend/app.py directly (without package context).
    from utils.huggingface_ai import generate_ai_response, generate_medical_ai_response, transcribe_audio_with_whisper
    from models.ai_engine import ai_engine
    from models.emergency_detector import emergency_detector

chatbot_bp = Blueprint('chatbot', __name__)

# Conversation memory (in-memory per session)
_conversations = {}


def _safe_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return float(default)


def _normalize_vitals(vitals):
    vitals = vitals or {}
    bp = str(vitals.get('blood_pressure', '120/80'))
    systolic = _safe_float(vitals.get('systolic_bp'), 120)
    diastolic = _safe_float(vitals.get('diastolic_bp'), 80)
    if '/' in bp:
        try:
            bp_parts = bp.split('/')
            systolic = _safe_float(bp_parts[0], systolic)
            diastolic = _safe_float(bp_parts[1], diastolic)
        except Exception:
            pass

    return {
        'heart_rate': _safe_float(vitals.get('heart_rate'), 72),
        'blood_pressure': f"{int(round(systolic))}/{int(round(diastolic))}",
        'systolic_bp': int(round(systolic)),
        'diastolic_bp': int(round(diastolic)),
        'spo2': _safe_float(vitals.get('spo2'), 98),
        'temperature': _safe_float(vitals.get('temperature'), 98.6),
        'respiration_rate': _safe_float(vitals.get('respiration_rate'), 16),
        'blood_glucose': _safe_float(vitals.get('blood_glucose'), 95),
        'steps': _safe_float(vitals.get('steps'), 4000),
        'sleep_hours': _safe_float(vitals.get('sleep_hours'), 7),
    }


def _build_personalized_medical_fallback(patient_context):
    """Return safe personalized suggestions when external AI provider is unavailable."""
    context = patient_context or {}
    vitals = _normalize_vitals(context.get('vitals', {}))
    conditions = context.get('conditions') or []
    medications = context.get('medications') or []

    tips = []

    hr = vitals['heart_rate']
    if hr > 100:
        tips.append("- Heart rate is elevated. Rest for 10-15 minutes, hydrate, and recheck.")
    elif hr < 60:
        tips.append("- Heart rate is lower than usual. Avoid sudden standing and monitor for dizziness.")
    else:
        tips.append("- Heart rate looks stable. Continue light daily activity.")

    if vitals['systolic_bp'] >= 140 or vitals['diastolic_bp'] >= 90:
        tips.append("- Blood pressure is above target. Reduce salt intake and practice stress-reduction breathing.")
    elif vitals['systolic_bp'] <= 90 or vitals['diastolic_bp'] <= 60:
        tips.append("- Blood pressure is on the lower side. Increase hydration unless restricted by your doctor.")
    else:
        tips.append("- Blood pressure is within an acceptable range. Maintain your current routine.")

    if vitals['spo2'] < 95:
        tips.append("- Oxygen level is lower than ideal. Perform slow deep-breathing and seek urgent care if breathlessness worsens.")
    else:
        tips.append("- Oxygen saturation is reassuring. Continue posture and breathing exercises.")

    glucose = vitals['blood_glucose']
    if glucose >= 140:
        tips.append("- Blood glucose is elevated. Prefer low-glycemic meals and a short walk after food if safe.")
    elif 0 < glucose < 70:
        tips.append("- Blood glucose is low. Take a quick carbohydrate snack and recheck soon.")
    else:
        tips.append("- Blood glucose trend appears acceptable. Keep regular meal timing.")

    if conditions:
        tips.append(f"- Keep monitoring your known conditions: {', '.join(map(str, conditions[:4]))}.")

    if medications:
        tips.append("- Continue medicines exactly as prescribed and avoid skipping doses.")

    safety = "Safety note: This is guidance only, not a diagnosis. Contact your doctor for persistent symptoms or worsening readings."
    return "\n".join(tips[:5] + [safety])


def _extract_possible_conditions(ai_summary_text):
    conditions = []

    for line in str(ai_summary_text or '').splitlines():
        text = line.strip().lstrip('-').lstrip('*').strip()
        if not text:
            continue
        low = text.lower()
        if low.startswith('possible conditions'):
            _, _, rhs = text.partition(':')
            for item in rhs.split(','):
                item_text = item.strip()
                if item_text and item_text not in conditions:
                    conditions.append(item_text)

    if not conditions:
        conditions.append('Further clinical assessment required')

    return conditions[:5]


def _flatten_recommendations(combined_result):
    recommendations = []

    for item in combined_result.get('recommendations', []):
        if isinstance(item, dict) and item.get('text'):
            recommendations.append(item['text'])
        elif isinstance(item, str):
            recommendations.append(item)

    if not recommendations:
        recommendations.append('Consult your doctor for a complete evaluation.')

    return recommendations[:6]


def _detect_emergency(message):
    """Detect emergency keywords in the message."""
    msg = message.lower().strip()
    emergency_keywords = [
        'emergency', 'heart attack', 'can\'t breathe', 'cannot breathe', 'severe pain',
        'unconscious', 'bleeding heavily', 'stroke', 'passing out', 'choking',
        'call 911', 'ambulance', 'dying', 'critical', 'life threatening'
    ]
    return any(keyword in msg for keyword in emergency_keywords)


def _detect_greeting(message):
    """Detect greeting in the message."""
    msg = message.lower().strip()
    greetings = ['hello', 'hi', 'hey', 'good morning', 'good evening', 'good afternoon']
    return any(greeting in msg for greeting in greetings)


def _detect_farewell(message):
    """Detect farewell in the message."""
    msg = message.lower().strip()
    farewells = ['bye', 'goodbye', 'thank you', 'thanks', 'see you', 'take care']
    return any(farewell in msg for farewell in farewells)


def _generate_response(message, user_role='patient', patient_context=None, conversation_id=None):
    """
    Generate an AI response using Hugging Face Mistral-7B API.
    Falls back to special handling for emergencies and greetings.
    """
    # Emergency detection - always prioritize
    if _detect_emergency(message):
        return {
            'message': "🚨 **EMERGENCY DETECTED** — If you are experiencing a life-threatening emergency, please call **911** or your local emergency number immediately.\n\nWhile waiting for help:\n• Stay calm and sit or lie down\n• If experiencing chest pain, chew an aspirin if not allergic\n• If someone is unconscious, check breathing and begin CPR if trained\n• Do not drive yourself to the hospital\n\nI'm alerting the medical team now.",
            'type': 'emergency',
            'severity': 'critical',
            'suggestions': ['Call 911', 'I need help with something else'],
        }
    
    # Get conversation history for context
    conversation_history = _conversations.get(conversation_id, [])
    
    # Generate AI response using Hugging Face
    try:
        response = generate_ai_response(
            message=message,
            conversation_history=conversation_history,
            user_role=user_role,
            patient_context=patient_context,
            use_fallback=False
        )
        return response
    except Exception as e:
        print(f"Error generating AI response: {str(e)}")
        # Fallback to basic response
        return {
            'message': f"I understand your question: {message[:80]}...\n\nAs your AI Health Assistant, I'm here to provide general health information and support. Please consult with a medical professional for specific diagnosis and treatment recommendations.",
            'type': 'general',
            'suggestions': ['Tell me more', 'Check symptoms', 'Book appointment'],
        }




@chatbot_bp.route('/chat', methods=['POST'])
def chat():
    """Process a chat message and return AI-powered response."""
    data = request.get_json()
    if not data or not data.get('message'):
        return jsonify({'error': 'Message is required'}), 400

    message = data['message']
    user_role = data.get('role', 'patient')
    conversation_id = data.get('conversation_id', 'default')
    patient_context = data.get('patient_context', {})

    # Generate AI response
    response = _generate_response(
        message=message,
        user_role=user_role,
        patient_context=patient_context,
        conversation_id=conversation_id
    )

    # Store conversation turn in history
    if conversation_id not in _conversations:
        _conversations[conversation_id] = []

    _conversations[conversation_id].append({
        'role': 'user',
        'message': message,
        'timestamp': datetime.now().isoformat(),
    })
    _conversations[conversation_id].append({
        'role': 'assistant',
        'message': response['message'],
        'timestamp': datetime.now().isoformat(),
    })

    # Keep last 50 messages per conversation (for API token limits)
    if len(_conversations[conversation_id]) > 50:
        _conversations[conversation_id] = _conversations[conversation_id][-50:]

    return jsonify({
        'success': True,
        'response': response,
        'timestamp': datetime.now().isoformat(),
    })


@chatbot_bp.route('/medical-suggestion', methods=['POST'])
def medical_suggestion():
    """Generate medical suggestions using medical reasoning model."""
    data = request.get_json()
    if not data or not data.get('message'):
        return jsonify({'error': 'Message is required'}), 400

    message = data['message']
    conversation_id = data.get('conversation_id', 'medical-suggestion')
    patient_context = data.get('patient_context', {})

    conversation_history = _conversations.get(conversation_id, [])
    response = generate_medical_ai_response(
        message=message,
        conversation_history=conversation_history,
        user_role='patient',
        patient_context=patient_context,
        use_fallback=False,
    )

    if response.get('type') == 'error' or 'temporarily down' in str(response.get('message', '')).lower():
        response = {
            'message': _build_personalized_medical_fallback(patient_context),
            'type': 'fallback_response',
            'suggestions': ['Track vitals', 'Book appointment', 'Share symptom change'],
        }

    _conversations.setdefault(conversation_id, [])
    _conversations[conversation_id].append({
        'role': 'user',
        'message': message,
        'timestamp': datetime.now().isoformat(),
    })
    _conversations[conversation_id].append({
        'role': 'assistant',
        'message': response.get('message', ''),
        'timestamp': datetime.now().isoformat(),
    })
    if len(_conversations[conversation_id]) > 50:
        _conversations[conversation_id] = _conversations[conversation_id][-50:]

    return jsonify({
        'success': True,
        'response': response,
        'timestamp': datetime.now().isoformat(),
    })


@chatbot_bp.route('/voice-to-text', methods=['POST'])
def voice_to_text():
    """Transcribe patient audio using Whisper (openai/whisper-small)."""
    if 'audio' not in request.files:
        return jsonify({'success': False, 'error': 'Audio file is required'}), 400

    audio_file = request.files['audio']
    audio_bytes = audio_file.read()
    if not audio_bytes:
        return jsonify({'success': False, 'error': 'Empty audio file'}), 400

    transcription, error = transcribe_audio_with_whisper(audio_bytes)
    if not transcription:
        return jsonify({
            'success': False,
            'error': error or 'Transcription failed',
            'text': ''
        }), 502

    return jsonify({
        'success': True,
        'text': transcription,
        'model': 'openai/whisper-small',
        'timestamp': datetime.now().isoformat(),
    })


@chatbot_bp.route('/comprehensive-analysis', methods=['POST'])
def comprehensive_analysis():
    """Run unified multi-modal analysis for dashboard AI assistant output."""
    data = request.get_json() or {}
    vitals = _normalize_vitals(data.get('vitals', {}))
    patient_id = str(data.get('patient_id') or 'unknown')
    conversation = data.get('conversation', [])
    combined_result = ai_engine.analyze(
        pain_data=None,
        voice_data=None,
        smartwatch_data=vitals,
    )

    emergency_result = emergency_detector.evaluate(vitals, patient_id=patient_id)

    user_text = "\n".join([
        msg.get('content', '')
        for msg in conversation
        if str(msg.get('role', '')).lower() == 'user'
    ])
    summary_prompt = (
        "Summarize the patient's likely conditions and next clinical steps based on this dialogue. "
        "Use concise medical screening language and include a caution that this is not a final diagnosis.\n\n"
        f"Conversation:\n{user_text}"
    )
    ai_summary = generate_medical_ai_response(
        message=summary_prompt,
        conversation_history=[],
        user_role='patient',
        patient_context={'vitals': vitals},
        use_fallback=False,
    )
    summary_text = ai_summary.get('message', '')

    risk_percentage = combined_result.get('risk_percentage', 0)
    risk_level = 'low'
    if emergency_result.get('severity') in ('critical', 'danger'):
        risk_level = 'critical'
    elif risk_percentage >= 65:
        risk_level = 'high'
    elif risk_percentage >= 35:
        risk_level = 'medium'

    response_payload = {
        'success': True,
        'pain_level': 0,
        'possible_conditions': _extract_possible_conditions(summary_text),
        'confidence': round(min(99.0, max(
            55.0,
            100 - float(risk_percentage)
        )) / 100.0, 3),
        'recommendations': _flatten_recommendations(combined_result),
        'risk_level': risk_level,
        'risk_description': combined_result.get('overall_status', 'Monitor health status'),
        'alert_triggered': emergency_result.get('is_emergency', False) or risk_level in ('critical', 'high'),
        'emergency': emergency_result,
        'modules': {
            'text_analysis': True,
            'voice_analysis': False,
            'face_analysis': False,
            'vitals_analysis': True,
        },
        'raw': {
            'pain': None,
            'voice': None,
            'combined': combined_result,
            'summary': summary_text,
        },
        'timestamp': datetime.now().isoformat(),
    }

    return jsonify(response_payload)



@chatbot_bp.route('/history', methods=['GET'])
def get_history():
    """Get conversation history."""
    conversation_id = request.args.get('conversation_id', 'default')
    history = _conversations.get(conversation_id, [])
    return jsonify({
        'success': True,
        'history': history,
        'count': len(history),
    })


@chatbot_bp.route('/suggestions', methods=['GET'])
def get_suggestions():
    """Get contextual suggestions based on user role."""
    role = request.args.get('role', 'patient')

    if role == 'doctor':
        suggestions = [
            'Patient summary for today',
            'Review critical alerts',
            'Drug interaction check',
            'Treatment protocols',
            'Lab result interpretation',
        ]
    else:
        suggestions = [
            'Check my symptoms',
            'View my vitals',
            'Health tips',
            'Book appointment',
            'Medication questions',
        ]

    return jsonify({'success': True, 'suggestions': suggestions})
