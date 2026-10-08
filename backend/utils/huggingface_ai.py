"""
Hugging Face AI Integration Module.
Supports separate models for chatbot and medical suggestion/prediction tasks.
"""

import os
from typing import List, Dict, Optional, Tuple
from huggingface_hub import InferenceClient
import requests

# Hugging Face API Configuration
DEFAULT_CHATBOT_MODEL = "mistralai/Mistral-7B-Instruct-v0.3"
DEFAULT_MEDICAL_MODEL = "kingabzpro/DeepSeek-R1-0528-Qwen3-8B-Medical-Reasoning"
HF_API_TIMEOUT = int(os.getenv('HF_API_TIMEOUT', '90'))
DEFAULT_STT_MODEL = os.getenv('HF_STT_MODEL_ID', 'openai/whisper-small')

# Medical Safety Instructions to embed in prompts
MEDICAL_SAFETY_PROMPT = """You are a helpful AI Health Assistant in a medical app. 
Important safety guidelines:
1. NEVER provide final diagnoses - always suggest consulting a doctor for diagnosis
2. NEVER prescribe medications - refer to healthcare providers
3. Always emphasize the need for professional medical consultation for serious symptoms
4. Provide general health information and symptom assessment only
5. Be empathetic and supportive in responses
6. For emergencies, always advise calling emergency services (911 in USA)
7. Format responses clearly with emphasis where needed using **bold** text
8. Keep responses concise but informative
"""


def _get_model_for_task(task: str = 'chatbot') -> str:
    """Return the configured model ID for a task."""
    normalized_task = (task or 'chatbot').strip().lower()
    if normalized_task == 'medical':
        configured = os.getenv('HF_MEDICAL_MODEL_ID', DEFAULT_MEDICAL_MODEL).strip()
        return configured or DEFAULT_MEDICAL_MODEL

    # Backward compatible chain for chatbot model selection.
    configured = (
        os.getenv('HF_CHATBOT_MODEL_ID', '').strip()
        or os.getenv('HF_MODEL_ID', '').strip()
        or DEFAULT_CHATBOT_MODEL
    )
    return configured


def _get_model_candidates_for_task(task: str = 'chatbot') -> List[str]:
    """Return ordered model candidates for a task (primary first)."""
    primary = _get_model_for_task(task)
    candidates = [primary]

    fallback_env = ''
    normalized_task = (task or 'chatbot').strip().lower()
    if normalized_task == 'chatbot':
        fallback_env = os.getenv('HF_CHATBOT_FALLBACK_MODEL_IDS', '').strip()
    elif normalized_task == 'medical':
        fallback_env = os.getenv('HF_MEDICAL_FALLBACK_MODEL_IDS', '').strip()

    if fallback_env:
        for item in fallback_env.split(','):
            model_id = item.strip()
            if model_id and model_id not in candidates:
                candidates.append(model_id)

    return candidates


def build_conversation_prompt(
    conversation_history: List[Dict], 
    current_message: str,
    user_role: str = 'patient',
    patient_context: Optional[Dict] = None
) -> str:
    """
    Build a prompt from conversation history for context-aware responses.
    
    Args:
        conversation_history: List of {role, message} dicts
        current_message: The current user message
        user_role: 'patient' or 'doctor'
        patient_context: Optional patient data for context
        
    Returns:
        Formatted prompt string for the AI model
    """
    role_instruction = ""
    if user_role == 'doctor':
        role_instruction = "You are an AI Clinical Assistant helping a doctor with patient care, treatment protocols, and clinical decision support."
    else:
        role_instruction = "You are an AI Health Assistant helping a patient with symptom assessment, health tips, and wellness guidance."
    
    # Build conversation context
    conversation_text = ""
    for msg in conversation_history[-10:]:  # Last 10 messages for context
        role = msg.get('role', '').lower()
        text = msg.get('message', '')
        if role == 'user':
            conversation_text += f"Patient/User: {text}\n"
        elif role == 'assistant':
            conversation_text += f"AI Assistant: {text}\n"
    
    # Add patient context if available
    context_text = ""
    if patient_context:
        if patient_context.get('vitals'):
            v = patient_context['vitals']
            context_text += "\nCurrent Patient Vitals:\n"
            context_text += f"- Heart Rate: {v.get('heart_rate', 'N/A')} bpm\n"
            context_text += f"- Blood Pressure: {v.get('blood_pressure', 'N/A')} mmHg\n"
            context_text += f"- SpO2: {v.get('spo2', 'N/A')}%\n"
            context_text += f"- Temperature: {v.get('temperature', 'N/A')}°F\n"
        
        if patient_context.get('conditions'):
            context_text += f"- Known Conditions: {', '.join(patient_context['conditions'])}\n"
        
        if patient_context.get('medications'):
            context_text += f"- Current Medications: {', '.join(patient_context['medications'])}\n"
    
    # Combine into final prompt
    prompt = f"""{MEDICAL_SAFETY_PROMPT}

{role_instruction}
{context_text}

Previous Conversation:
{conversation_text}

User's Current Question: {current_message}

Provide a helpful, empathetic response. Remember to always suggest professional medical consultation when appropriate."""
    
    return prompt


def _call_hf_model(model_id: str, prompt: str, max_tokens: int = 512) -> Tuple[Optional[str], Optional[str]]:
    """Call a specific Hugging Face model and return (text, error)."""
    hf_api_key = os.getenv('HUGGINGFACE_API_KEY', '').strip()
    if not hf_api_key or hf_api_key == 'hf_YOUR_TOKEN_HERE':
        return None, 'missing_api_key'

    client = InferenceClient(model=model_id, token=hf_api_key, timeout=HF_API_TIMEOUT)
    last_error = 'empty_response'

    # Path 1: modern chat completions API.
    try:
        if hasattr(client, 'chat') and hasattr(client.chat, 'completions'):
            completion = client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=float(os.getenv('HF_API_TEMPERATURE', '0.5')),
                top_p=float(os.getenv('HF_API_TOP_P', '0.9')),
            )
            content = completion.choices[0].message.content if completion and completion.choices else None
            if content:
                return content.strip(), None
    except Exception as exc:
        last_error = f'chat_completions_failed: {exc}'

    # Path 2: text generation API via huggingface_hub.
    try:
        generated = client.text_generation(
            prompt,
            max_new_tokens=max_tokens,
            temperature=float(os.getenv('HF_API_TEMPERATURE', '0.5')),
            top_p=float(os.getenv('HF_API_TOP_P', '0.9')),
            do_sample=True,
            repetition_penalty=1.05,
            return_full_text=False,
        )
        if generated:
            return str(generated).strip(), None
    except Exception as exc:
        last_error = f'text_generation_failed: {exc}'

    # Path 3: direct Inference API HTTP fallback.
    try:
        response = requests.post(
            f'https://api-inference.huggingface.co/models/{model_id}',
            headers={'Authorization': f'Bearer {hf_api_key}'},
            json={
                'inputs': prompt,
                'parameters': {
                    'max_new_tokens': max_tokens,
                    'temperature': float(os.getenv('HF_API_TEMPERATURE', '0.5')),
                    'top_p': float(os.getenv('HF_API_TOP_P', '0.9')),
                    'return_full_text': False,
                },
            },
            timeout=HF_API_TIMEOUT,
        )
        if response.ok:
            payload = response.json()
            if isinstance(payload, list) and payload:
                text = str(payload[0].get('generated_text', '')).strip()
                if text:
                    return text, None
            if isinstance(payload, dict):
                # Some providers return chat-like payloads.
                text = str(payload.get('generated_text', '')).strip()
                if text:
                    return text, None
                choices = payload.get('choices')
                if isinstance(choices, list) and choices:
                    choice_msg = choices[0].get('message', {})
                    text = str(choice_msg.get('content', '')).strip()
                    if text:
                        return text, None
        else:
            last_error = f'direct_http_failed: {response.status_code} {response.text[:160]}'
    except Exception as exc:
        last_error = f'direct_http_exception: {exc}'

    return None, last_error


def call_best_hf_model(prompt: str, max_tokens: int = 512, task: str = 'chatbot') -> Tuple[Optional[str], Optional[str]]:
    """Call the configured model for a task and return (text, model_id)."""
    errors = []
    missing_key = False
    for model_id in _get_model_candidates_for_task(task):
        text, error = _call_hf_model(model_id, prompt, max_tokens=max_tokens)
        if text:
            return text, model_id
        if error == 'missing_api_key':
            missing_key = True
        errors.append(f'{model_id}: {error}')

    print(f"Hugging Face model call failed for task={task}: {' | '.join(errors)}")
    if missing_key:
        print("Warning: HUGGINGFACE_API_KEY not set or still using placeholder.")

    return None, None


def call_mistral_api(prompt: str, max_tokens: int = 512) -> Optional[str]:
    """
    Call the Hugging Face Mistral-7B API with the given prompt.
    
    Args:
        prompt: The prompt to send to the model
        max_tokens: Maximum tokens in response (default 512)
        
    Returns:
        Generated response text or None if API fails
    """
    # Backwards-compatible wrapper for setup scripts/tests.
    text, _ = call_best_hf_model(prompt, max_tokens=max_tokens, task='chatbot')
    return text


def transcribe_audio_with_whisper(audio_bytes: bytes, model_id: Optional[str] = None) -> Tuple[Optional[str], Optional[str]]:
    """Transcribe raw audio bytes using Whisper via Hugging Face Inference API."""
    hf_api_key = os.getenv('HUGGINGFACE_API_KEY', '').strip()
    if not hf_api_key:
        return None, 'missing_api_key'

    target_model = (model_id or DEFAULT_STT_MODEL).strip()
    if not target_model:
        target_model = 'openai/whisper-small'

    try:
        client = InferenceClient(model=target_model, token=hf_api_key, timeout=HF_API_TIMEOUT)

        # Primary method on current huggingface-hub.
        if hasattr(client, 'automatic_speech_recognition'):
            result = client.automatic_speech_recognition(audio=audio_bytes)
            if isinstance(result, str):
                text = result.strip()
            else:
                text = str(result.get('text', '')).strip() if isinstance(result, dict) else ''
            if text:
                return text, None

        # Compatibility path for older clients.
        if hasattr(client, 'audio_to_text'):
            result = client.audio_to_text(audio=audio_bytes)
            if isinstance(result, str):
                text = result.strip()
            else:
                text = str(result.get('text', '')).strip() if isinstance(result, dict) else ''
            if text:
                return text, None

        return None, 'empty_transcription'
    except Exception as exc:
        return None, str(exc)


def generate_ai_response(
    message: str,
    conversation_history: List[Dict],
    user_role: str = 'patient',
    patient_context: Optional[Dict] = None,
    use_fallback: bool = False,
    task: str = 'chatbot'
) -> Dict:
    """
    Generate an AI response using a task-specific model.
    
    Args:
        message: The user's message
        conversation_history: List of previous conversation turns
        user_role: 'patient' or 'doctor'
        patient_context: Optional patient data
        use_fallback: If True, use basic response (for testing without API key)
        
    Returns:
        Response dict with 'message', 'type', 'suggestions', etc.
    """
    # Build context-aware prompt
    prompt = build_conversation_prompt(
        conversation_history,
        message,
        user_role,
        patient_context
    )
    
    # Call task-specific Hugging Face model.
    ai_response, model_used = call_best_hf_model(prompt, task=task)
    
    # Fallback if API fails
    if not ai_response:
        if use_fallback:
            ai_response = f"I understand: {message[:100]}... As your AI Health Assistant, I can provide general health information. Please ensure to consult with a medical professional for specific diagnosis and treatment."
        else:
            return {
                'message': "I'm currently unavailable. The AI service is temporarily down. Please try again later or chat with our support team.",
                'type': 'error',
                'suggestions': ['Try again', 'Contact support'],
            }
    
    # Clean response
    ai_response = ai_response.strip()
    
    # Ensure medical safety reminder
    if 'diagnosis' not in ai_response.lower() and 'consult' not in ai_response.lower():
        ai_response += "\n\n*Please consult with a medical professional for proper diagnosis and treatment.*"
    
    # Generate follow-up suggestions
    suggestions = generate_suggestions(message, user_role)
    
    return {
        'message': ai_response,
        'type': 'ai_response',
        'suggestions': suggestions,
        'follow_up_questions': [],
        'model_used': model_used,
    }


def generate_medical_ai_response(
    message: str,
    conversation_history: List[Dict],
    user_role: str = 'patient',
    patient_context: Optional[Dict] = None,
    use_fallback: bool = False
) -> Dict:
    """Generate response using the medical reasoning model."""
    return generate_ai_response(
        message=message,
        conversation_history=conversation_history,
        user_role=user_role,
        patient_context=patient_context,
        use_fallback=use_fallback,
        task='medical',
    )


def generate_suggestions(message: str, user_role: str = 'patient') -> List[str]:
    """Generate contextual quick-reply suggestions."""
    msg_lower = message.lower()
    
    if user_role == 'doctor':
        if any(word in msg_lower for word in ['patient', 'case', 'treatment']):
            return ['View labs', 'Check protocols', 'Drug interactions', 'Patient notes']
        else:
            return ['Patient summary', 'Critical alerts', 'Treatment options', 'Drug check']
    else:
        if any(word in msg_lower for word in ['symptom', 'pain', 'feel', 'hurt']):
            return ['Tell me more', 'When did it start?', 'Book appointment', 'Other symptoms']
        elif any(word in msg_lower for word in ['healthy', 'health', 'exercise', 'diet']):
            return ['Health tips', 'Exercise plans', 'Nutrition advice', 'Sleep tips']
        elif any(word in msg_lower for word in ['appointment', 'doctor', 'visit', 'schedule']):
            return ['Book now', 'View available', 'Change appointment', 'My schedule']
        else:
            return ['Check symptoms', 'View vitals', 'Health tips', 'Book appointment']
