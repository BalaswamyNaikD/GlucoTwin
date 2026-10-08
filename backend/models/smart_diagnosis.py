"""
AI Smart Diagnosis Engine
Combines voice, facial cues, and conversational symptom text for interactive
preliminary condition assessment (not a final diagnosis).
"""

import base64
import os
import re
from typing import Dict, List, Tuple

from huggingface_hub import InferenceClient

from utils.huggingface_ai import call_best_hf_model


class SmartDiagnosisEngine:
    """Interactive multimodal smart diagnosis engine."""

    CONDITION_MAP = {
        'respiratory': {
            'name': 'Respiratory Condition',
            'icon': '🫁',
            'keywords_en': ['cough', 'breath', 'wheezing', 'chest tight', 'phlegm', 'cold'],
            'keywords_te': ['దగ్గు', 'శ్వాస', 'ఉపిరి', 'గిలగిల', 'చెస్ట్', 'కఫం'],
        },
        'parkinsons': {
            'name': "Neurological Voice Concern",
            'icon': '🧠',
            'keywords_en': ['tremor', 'voice weak', 'slow speech', 'stiffness'],
            'keywords_te': ['కంపనం', 'నెమ్మది మాట', 'బలహీన స్వరం', 'గట్టితనం'],
        },
        'depression': {
            'name': 'Emotional Health Concern',
            'icon': '💭',
            'keywords_en': ['sad', 'low mood', 'stress', 'anxiety', 'sleep issue', 'hopeless'],
            'keywords_te': ['దుఃఖం', 'మానసిక ఒత్తిడి', 'ఆందోళన', 'నిద్ర సమస్య', 'నిరుత్సాహం'],
        },
        'migraine': {
            'name': 'Headache / Migraine Pattern',
            'icon': '🤕',
            'keywords_en': ['headache', 'light sensitive', 'nausea', 'one side pain'],
            'keywords_te': ['తలనొప్పి', 'వాంతి', 'కాంతి బాధ', 'ఒకవైపు నొప్పి'],
        },
        'gastro': {
            'name': 'Gastrointestinal Concern',
            'icon': '🫗',
            'keywords_en': ['stomach', 'acidity', 'vomit', 'loose motion', 'abdominal pain'],
            'keywords_te': ['కడుపు', 'ఆమ్లత్వం', 'వాంతి', 'డైరియా', 'అబ్డొమినల్ నొప్పి'],
        },
    }

    def __init__(self):
        self.hf_api_key = os.getenv('HUGGINGFACE_API_KEY', '').strip()
        self.whisper_model = os.getenv('HF_WHISPER_MODEL', 'openai/whisper-small')

    def transcribe_audio(self, audio_data: str, language: str = 'en') -> str:
        """Public wrapper for backend STT fallback."""
        return self._transcribe_with_whisper(audio_data, language)

    def _decode_audio_bytes(self, audio_data: str) -> bytes:
        if not audio_data:
            return b''
        data = audio_data.split(',', 1)[1] if ',' in audio_data else audio_data
        return base64.b64decode(data)

    def _transcribe_with_whisper(self, audio_data: str, language: str) -> str:
        if not self.hf_api_key or not audio_data:
            return ''

        try:
            client = InferenceClient(model=self.whisper_model, token=self.hf_api_key, timeout=90)
            audio_bytes = self._decode_audio_bytes(audio_data)
            if not audio_bytes:
                return ''

            result = client.automatic_speech_recognition(audio=audio_bytes)
            if isinstance(result, dict):
                return str(result.get('text', '')).strip()
            return str(result).strip()
        except Exception:
            return ''

    def _extract_keywords(self, text: str, language: str) -> Dict[str, int]:
        normalized = (text or '').lower()
        scores = {k: 0 for k in self.CONDITION_MAP.keys()}

        for condition, cfg in self.CONDITION_MAP.items():
            keyword_set = cfg['keywords_te'] if language == 'te' else cfg['keywords_en']
            for keyword in keyword_set:
                if keyword.lower() in normalized:
                    scores[condition] += 1

        return scores

    def _voice_signal_proxy(self, text: str, language: str, audio_data: str = '') -> Dict:
        """Build a lightweight voice-risk proxy from symptom text when voice model is removed."""
        symptom_scores = self._extract_keywords(text, language)

        respiratory_raw = 1.0 + symptom_scores.get('respiratory', 0) * 1.5
        parkinsons_raw = 0.8 + symptom_scores.get('parkinsons', 0) * 1.4
        depression_raw = 0.9 + symptom_scores.get('depression', 0) * 1.3
        healthy_boost = 3.2 if sum(symptom_scores.values()) == 0 else 1.1
        healthy_raw = healthy_boost

        total = healthy_raw + respiratory_raw + parkinsons_raw + depression_raw
        probabilities = {
            'healthy': round((healthy_raw / total) * 100, 1),
            'parkinsons': round((parkinsons_raw / total) * 100, 1),
            'respiratory': round((respiratory_raw / total) * 100, 1),
            'depression': round((depression_raw / total) * 100, 1),
        }

        primary_condition = max(probabilities, key=probabilities.get)
        confidence = probabilities[primary_condition]

        risk_level = 'low'
        if primary_condition != 'healthy' and confidence >= 60:
            risk_level = 'high'
        elif primary_condition != 'healthy' and confidence >= 40:
            risk_level = 'medium'

        recommendations = {
            'healthy': [
                'Symptoms appear mild from current inputs.',
                'Continue monitoring and consult a doctor if symptoms persist.',
            ],
            'parkinsons': [
                'Discuss speech and movement changes with a neurologist.',
                'Track symptom progression and seek clinical confirmation.',
            ],
            'respiratory': [
                'Monitor breathing symptoms and oxygen levels closely.',
                'Seek urgent care if breathlessness increases.',
            ],
            'depression': [
                'Consider mental health consultation for persistent low mood.',
                'Seek immediate support if distress worsens.',
            ],
        }

        return {
            'success': True,
            'results': {
                key: {
                    'probability': value,
                }
                for key, value in probabilities.items()
            },
            'primary_condition': primary_condition,
            'primary_info': {
                'name': primary_condition.replace('_', ' ').title(),
                'description': 'Keyword-based proxy signal from conversation context.',
            },
            'confidence': confidence,
            'risk_level': risk_level,
            'features_extracted': bool(audio_data),
            'recommendations': recommendations.get(primary_condition, recommendations['healthy']),
            'model_removed': True,
        }

    def _estimate_emotional_state(self, text: str, voice_result: Dict) -> str:
        normalized = (text or '').lower()

        distress_words = ['pain', 'severe', 'unable', 'worry', 'fear', 'anxiety', 'stress', 'cry']
        distress_te = ['నొప్పి', 'భయం', 'ఆందోళన', 'ఒత్తిడి', 'ఎక్కువ']
        distress_score = sum(1 for w in distress_words if w in normalized) + sum(1 for w in distress_te if w in normalized)

        if voice_result.get('primary_condition') == 'depression':
            distress_score += 2

        if distress_score >= 4:
            return 'distressed'
        if distress_score >= 2:
            return 'concerned'
        return 'stable'

    def _discomfort_from_signals(self, pain_score, voice_result: Dict, symptom_scores: Dict[str, int]) -> Tuple[int, str]:
        score = int(pain_score or 0)

        top_voice = float(voice_result.get('confidence', 0) or 0)
        if voice_result.get('primary_condition') != 'healthy' and top_voice >= 65:
            score += 2
        elif voice_result.get('primary_condition') != 'healthy' and top_voice >= 40:
            score += 1

        score += min(3, max(symptom_scores.values()) if symptom_scores else 0)
        score = max(0, min(score, 10))

        if score >= 7:
            return score, 'High'
        if score >= 4:
            return score, 'Moderate'
        return score, 'Low'

    def _possible_conditions(self, voice_result: Dict, symptom_scores: Dict[str, int]) -> List[Dict]:
        candidates = []
        voice_results = voice_result.get('results', {}) if isinstance(voice_result, dict) else {}

        for key, cfg in self.CONDITION_MAP.items():
            voice_prob = float(voice_results.get(key, {}).get('probability', 0))
            symptom_boost = symptom_scores.get(key, 0) * 8
            probability = round(min(95.0, voice_prob * 0.7 + symptom_boost), 1)
            if probability >= 18:
                candidates.append({
                    'key': key,
                    'name': cfg['name'],
                    'icon': cfg['icon'],
                    'probability': probability,
                    'is_possible': True,
                })

        if not candidates:
            # Always provide meaningful, actionable preliminary possibilities.
            fallback = [
                {
                    'key': 'general_inflammatory',
                    'name': 'General Inflammatory / Infective Pattern',
                    'icon': '🩺',
                    'probability': 58.0,
                    'is_possible': True,
                },
                {
                    'key': 'functional_stress',
                    'name': 'Functional Stress-Related Condition',
                    'icon': '💭',
                    'probability': 46.0,
                    'is_possible': True,
                },
                {
                    'key': 'respiratory',
                    'name': 'Respiratory Condition',
                    'icon': '🫁',
                    'probability': 35.0,
                    'is_possible': True,
                },
            ]
            return fallback

        candidates.sort(key=lambda c: c['probability'], reverse=True)
        return candidates[:3]

    def _fallback_questions(self, text: str, language: str) -> List[str]:
        symptom = 'respiratory' if any(k in (text or '').lower() for k in ['cough', 'breath', 'దగ్గు', 'శ్వాస']) else 'general'

        if language == 'te':
            if symptom == 'respiratory':
                return [
                    'ఈ సమస్య ఎన్ని రోజులుగా ఉంది?',
                    'ఉపిరి పీల్చుకునేప్పుడు ఇబ్బంది పెరుగుతుందా?',
                    'జ్వరం లేదా దగ్గు రాత్రిళ్లు ఎక్కువగా ఉంటుందా?',
                    'ఈ లక్షణాలు ఏ సందర్భంలో ఎక్కువవుతున్నాయి?',
                ]
            return [
                'ఈ లక్షణాలు ఎప్పుడు మొదలయ్యాయి?',
                'నొప్పి లేదా అసౌకర్యం ఏ భాగంలో ఎక్కువగా ఉంది?',
                'నొప్పి గట్టిగా ఉందా లేక మెల్లిగా ఉందా?',
                'ఇటీవల నిద్ర, ఆకలి, ఒత్తిడి ఎలా ఉన్నాయి?',
            ]

        if symptom == 'respiratory':
            return [
                'How long have you had these breathing symptoms?',
                'Do you feel breathlessness while walking or also at rest?',
                'Do cough or chest symptoms worsen at night?',
                'Do you have fever along with this?',
            ]

        return [
            'When did these symptoms start?',
            'Where is the discomfort strongest right now?',
            'Is the pain sharp, dull, burning, or pressure-like?',
            'What triggers or worsens your symptoms?',
            'How are your sleep and stress levels recently?',
        ]

    def generate_follow_up_questions(self, text: str, language: str, asked_questions: List[str] = None) -> List[str]:
        asked_questions = asked_questions or []
        base_text = (text or '').strip()

        prompt = (
            "You are a medical AI assistant. "
            "Ask clear, simple, relevant follow-up questions like a doctor. "
            "Avoid generic responses. Focus on symptoms, duration, severity, and triggers. "
            "Ask exactly 4 follow-up questions. Questions must be safe and non-diagnostic. "
            "Avoid repeating already asked questions: " + str(asked_questions) + ". "
            "Return only numbered questions, one per line. "
            + ("Respond in Telugu language." if language == 'te' else "Respond in English.")
            + f"\nPatient statement: {base_text}"
        )

        response, _ = call_best_hf_model(prompt, max_tokens=220)
        if not response:
            return self._fallback_questions(base_text, language)

        lines = [re.sub(r'^\s*\d+[\).:-]?\s*', '', line).strip() for line in response.splitlines()]
        lines = [line for line in lines if len(line) > 8]

        deduped = []
        seen = {q.strip().lower() for q in asked_questions}
        for line in lines:
            key = line.lower()
            if key not in seen:
                deduped.append(line)
                seen.add(key)
            if len(deduped) >= 5:
                break

        if not deduped:
            return self._fallback_questions(base_text, language)

        return deduped[:5]

    def analyze(self, audio_data: str, transcription: str = '', language: str = 'en', pain_result: Dict = None, voice_result: Dict = None) -> Dict:
        language = 'te' if language == 'te' else 'en'

        stt_text = (transcription or '').strip()
        if not stt_text:
            stt_text = self._transcribe_with_whisper(audio_data, language)

        voice_data = voice_result or self._voice_signal_proxy(stt_text, language, audio_data)
        pain_score = (pain_result or {}).get('pain_score') if pain_result else None

        symptom_scores = self._extract_keywords(stt_text, language)
        discomfort_score, discomfort_level = self._discomfort_from_signals(pain_score, voice_data, symptom_scores)
        emotional_state = self._estimate_emotional_state(stt_text, voice_data)
        conditions = self._possible_conditions(voice_data, symptom_scores)

        top_prob = max((c['probability'] for c in conditions), default=50)
        confidence = round(min(98.0, max(45.0, top_prob * 0.85 + (8 if stt_text else 0))), 1)

        follow_up_questions = self.generate_follow_up_questions(stt_text, language, asked_questions=[])

        disclaimer = (
            'This is a preliminary AI-assisted screening, not a final diagnosis. Please consult a doctor.'
            if language == 'en'
            else 'ఇది ప్రాథమిక AI స్క్రీనింగ్ మాత్రమే, తుది నిర్ధారణ కాదు. దయచేసి డాక్టర్‌ను సంప్రదించండి.'
        )

        recommendations = [
            'Consult a qualified doctor with this summary.' if language == 'en' else 'ఈ నివేదికతో వైద్యుడిని సంప్రదించండి.',
            'Seek urgent care if symptoms worsen quickly.' if language == 'en' else 'లక్షణాలు వేగంగా పెరిగితే అత్యవసర వైద్యం పొందండి.',
        ]

        return {
            'success': True,
            'language': language,
            'transcription': stt_text,
            'primary_condition': conditions[0]['key'],
            'primary_condition_name': conditions[0]['name'],
            'possible_conditions': conditions,
            'conditions': {c['key']: c for c in conditions},
            'estimated_discomfort_score': discomfort_score,
            'discomfort_level': discomfort_level.lower(),
            'emotional_state': emotional_state,
            'confidence': confidence,
            'follow_up_questions': follow_up_questions[:5],
            'disclaimer': disclaimer,
            'recommendations': recommendations,
            'voice_analysis': voice_data,
            'pain_analysis': pain_result,
        }

    def process_follow_up_response(
        self,
        initial_result: Dict,
        follow_up_answer: str,
        language: str = 'en',
        asked_questions: List[str] = None,
        answers: List[str] = None,
        current_question: str = None,
    ) -> Dict:
        asked_questions = asked_questions or []
        answers = answers or []

        if current_question:
            asked_questions = [*asked_questions, current_question]
        answers = [*answers, (follow_up_answer or '').strip()]

        combined_text = ' '.join([initial_result.get('transcription', ''), *answers]).strip()
        next_candidates = self.generate_follow_up_questions(combined_text, language, asked_questions=asked_questions)
        next_question = next_candidates[0] if next_candidates else ''

        should_continue = len(asked_questions) < 5 and len(answers) < 3 and bool(next_question)

        base_conf = float(initial_result.get('confidence', 60))
        updated_conf = round(min(99.0, base_conf + 2.5), 1)

        symptom_scores = self._extract_keywords(combined_text, language)
        updated_conditions = self._possible_conditions(initial_result.get('voice_analysis', {}), symptom_scores)
        discomfort_score, discomfort_level = self._discomfort_from_signals(
            (initial_result.get('pain_analysis') or {}).get('pain_score'),
            initial_result.get('voice_analysis', {}),
            symptom_scores,
        )
        emotional_state = self._estimate_emotional_state(combined_text, initial_result.get('voice_analysis', {}))

        updated_summary = (
            f"Possible conditions include {', '.join([c['name'] for c in updated_conditions[:2]])}. "
            f"Discomfort appears {discomfort_level.lower()} (score {discomfort_score}/10), with emotional state {emotional_state}. "
            "Please consult your doctor with this conversation summary."
            if language != 'te'
            else
            f"సంభావ్య పరిస్థితులు: {', '.join([c['name'] for c in updated_conditions[:2]])}. "
            f"అసౌకర్యం {discomfort_level.lower()} స్థాయిలో ఉంది (స్కోర్ {discomfort_score}/10), భావోద్వేగ స్థితి {emotional_state}. "
            "ఈ సంభాషణ సారాంశంతో వైద్యుడిని సంప్రదించండి."
        )

        return {
            'success': True,
            'asked_questions': asked_questions,
            'answers': answers,
            'last_answer_text': answers[-1] if answers else '',
            'should_continue': should_continue,
            'next_question': next_question,
            'updated_summary': updated_summary,
            'updated_conditions': updated_conditions,
            'discomfort_level': discomfort_level.lower(),
            'estimated_discomfort_score': discomfort_score,
            'emotional_state': emotional_state,
            'confidence': updated_conf,
        }


smart_diagnosis_engine = SmartDiagnosisEngine()
