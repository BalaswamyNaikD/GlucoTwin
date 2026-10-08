"""
Language Support Utilities for AI Voice-Based Smart Diagnosis
Provides language translations and prompts for English and Telugu
"""

LANGUAGE_SUPPORT = {
    'en': {
        'recording_prompts': {
            'start': 'Recording started. Please describe your health concern for about one minute.',
            'stop': 'Recording stopped. Processing your audio...',
            'analyzing': 'Analyzing your symptoms using advanced AI...',
            'analyzing_tone': 'Analyzing emotional patterns and tone...',
            'question_intro': 'Based on your initial description, I have a few follow-up questions:',
            'thank_you': 'Thank you for providing that information.',
            'results_ready': 'Your preliminary analysis is ready.',
        },
        'questions': {
            'duration': 'How long have you had these symptoms?',
            'severity': 'On a scale of 1-10, how severe is your symptoms?',
            'triggers': 'What activities or situations make your symptoms worse?',
            'alleviating': 'What helps relieve your symptoms?',
            'other_symptoms': 'Do you have any other symptoms?',
            'medical_history': 'Do you have any relevant medical history?',
            'medications': 'Are you currently taking any medications?',
            'allergies': 'Do you have any known allergies?',
            'lifestyle': 'Have there been any recent changes in your lifestyle?',
            'emergency': 'Are you experiencing any life-threatening symptoms?'
        },
        'results': {
            'disclaimer': 'This is a preliminary AI-based screening. Always consult a qualified healthcare professional for proper diagnosis and treatment.',
            'confidence_label': 'Confidence Score',
            'discomfort_label': 'Discomfort Level',
            'recommendations_label': 'Clinical Recommendations',
            'follow_up_label': 'Suggested Follow-up Questions',
            'urgent_care': '⚠️ URGENT: Seek medical attention as soon as possible',
            'normal_care': 'Schedule a regular appointment with your healthcare provider',
            'preventive_care': 'Consider preventive health measures and maintain a healthy lifestyle',
        },
        'error_messages': {
            'no_audio': 'No audio was captured. Please try recording again.',
            'audio_too_short': 'Audio recording is too short. Please record for at least 10 seconds.',
            'processing_error': 'Error processing audio. Please try again.',
            'network_error': 'Network error. Please check your connection and try again.',
            'microphone_not_found': 'Unable to access microphone. Please grant permissions.',
        }
    },
    'te': {
        'recording_prompts': {
            'start': 'రికార్డింగ్ ప్రారంభమైంది. దయచేసి మీ ఆరోగ్య సమస్య గురించి ఒక నిమిషం చెప్పండి.',
            'stop': 'రికార్డింగ్ ఆపివేయబడింది. మీ ఆడియోను ప్రాసెస్ చేస్తున్నాము...',
            'analyzing': 'అధునాతన AI ఉపయోగించి మీ లక్షణాలను విశ్లేషణ చేస్తున్నాము...',
            'analyzing_tone': 'భావోద్వేగ నమూనాలు మరియు టోన్‌ను విశ్లేషణ చేస్తున్నాము...',
            'question_intro': 'మీ ప్రారంభ వివరణ ఆధారంగా, నాకు కొన్ని అనుసరణ ప్రశ్నలు ఉన్నాయి:',
            'thank_you': 'ఆ సమాచారం అందించినందుకు ధన్యవాదాలు.',
            'results_ready': 'మీ ప్రাథమిక విశ్లేషణ సిద్ధంగా ఉంది.',
        },
        'questions': {
            'duration': 'ఈ లక్షణాలు ఎంత కాలం ఉన్నాయి?',
            'severity': 'మీ లక్షణాల తీవ్రత 1-10 ప్రమాణంలో ఎంత?',
            'triggers': 'ఏ కార్యకలాపాలు లేదా పరిస్థితులు మీ లక్షణాలను మరిగిస్తాయి?',
            'alleviating': 'మీ లక్షణాలను ఉపశమనం చేయడానికి ఏమి సహాయపడుతుంది?',
            'other_symptoms': 'మీకు ఇతర కోణాలు ఉన్నాయా?',
            'medical_history': 'మీకు సంబంధిత వైద్య చరిత్ర ఉందా?',
            'medications': 'మీరు ప్రస్తుతం ఏ and ఔషధాలను తీసుకుంటున్నారు?',
            'allergies': 'మీకు తెలిసిన ఏ విషబారిన్ని ఉందా?',
            'lifestyle': 'మీ జీవనశైలిలో ఏ మార్పులు ఉన్నాయి?',
            'emergency': 'మీరు ఏ ప్రాణానికి ఖతరా పూడ్‌చే లక్షణాలను అనుభవిస్తున్నారా?'
        },
        'results': {
            'disclaimer': 'ఇది ప్రాయోగిక AI-ఆధారిత స్క్రీనింగ్. సరైన రోగనిర్ధారణ మరియు చికిత్స కోసం ఎల్లప్పుడూ నిపుణ ఆరోగ్య సేవాచ్యుని సంప్రదించండి.',
            'confidence_label': 'నమ్మకం స్కోర్',
            'discomfort_label': 'అసౌకర్య స్థాయి',
            'recommendations_label': 'క్లినికల్ సిఫారసులు',
            'follow_up_label': 'సూచించిన అనుसరణ ప్రశ్నలు',
            'urgent_care': '⚠️ అత్యవసర: వీలైనంత త్వరగా వైద్య సేవ చేకూడుకోండి',
            'normal_care': 'మీ ఆరోగ్య సేవాచ్యుని సక్రమంగా నియమితం చేయండి',
            'preventive_care': 'నివారణ ఆరోగ్య చర్యలను పరిగణించండి మరియు ఆరోగ్యకరమైన జీవనశైలిని కొనసాగించండి',
        },
        'error_messages': {
            'no_audio': 'ఆడియో క్యాప్చర్ చేయబడలేదు. దయచేసి మరోసారి రికార్డ్ చేయండి.',
            'audio_too_short': 'ఆడియో రికార్డింగ చాలా చిన్నది. కనీసం 10 సెకన్ల కోసం రికార్డ్ చేయండి.',
            'processing_error': 'ఆడియోను ప్రాసెస్ చేయడంలో లోపం. దయచేసి మరోసారి ప్రయత్నించండి.',
            'network_error': 'నెట్‌వర్క్ లోపం. దయచేసి మీ కనెక్షన్‌ను తనిఖీ చేసి మరోసారి ప్రయత్నించండి.',
            'microphone_not_found': 'మైక్రోఫోన్‌కు ప్రాప్తి సాధ్యం కాలేదు. దయచేసి అనుమతులను ఇవ్వండి.',
        }
    }
}


def get_text(language: str, category: str, key: str, default: str = '') -> str:
    """
    Get translated text for the specified language and key.
    
    Args:
        language: 'en' or 'te'
        category: Category of text (e.g., 'recording_prompts', 'questions', 'results')
        key: Specific key within the category
        default: Default text if key not found
    
    Returns:
        Translated text or default value
    """
    lang_dict = LANGUAGE_SUPPORT.get(language, LANGUAGE_SUPPORT['en'])
    category_dict = lang_dict.get(category, {})
    return category_dict.get(key, default)


def get_all_questions(language: str) -> list:
    """Get all available questions for a language."""
    questions = get_text(language, 'questions', None)
    if isinstance(questions, dict):
        return list(questions.values())
    return []


def format_condition_name(condition: str, language: str = 'en') -> str:
    """Format condition name with appropriate language."""
    condition_names = {
        'en': {
            'respiratory': 'Respiratory Disorder',
            'parkinsons': "Parkinson's Disease",
            'depression': 'Depression / Mental Health',
            'anxiety': 'Anxiety Disorder',
            'healthy': 'No significant concerns detected',
            'requires_consultation': 'Requires professional consultation'
        },
        'te': {
            'respiratory': 'శ్వాస వ్యాధి',
            'parkinsons': 'పార్కిన్సన్‌ వ్యాధి',
            'depression': 'నిరాశ / మానసిక ఆరోగ్యం',
            'anxiety': 'ఆందోళన రుగ్మత',
            'healthy': 'ఎటువంటి ఆందోళనలు గుర్తించబడలేదు',
            'requires_consultation': 'వృత్తిపరమైన సంప్రదింపు అవసరం'
        }
    }
    
    lang_conditions = condition_names.get(language, condition_names['en'])
    return lang_conditions.get(condition, condition.replace('_', ' ').title())


def create_response_prompt(language: str, category: str, key: str) -> str:
    """Create a prompt for response generation in the specified language."""
    return get_text(language, category, key)


# Telugu-specific utilities
TELUGU_VOWELS = 'అ ఆ ఇ ఈ ఉ ఊ ఋ ౠ ఎ ఏ ఐ ఓ ఒ ఔ'.split()
TELUGU_CONSONANTS = 'క�ణ చ ఛ జ ఝ ట ఠ డ ఢ ణ త థ ద ధ న ప ఫ బ భ మ య ర ల వ శ ష స హ'.split()


def is_telugu_text(text: str) -> bool:
    """Check if text contains Telugu characters."""
    for char in text:
        if ord(char) >= 0x0C00 and ord(char) <= 0x0C7F:
            return True
    return False


def detect_language(text: str) -> str:
    """Auto-detect language from text."""
    if is_telugu_text(text):
        return 'te'
    return 'en'
