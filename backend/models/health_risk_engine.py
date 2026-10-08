"""
Enhanced AI Health Risk Engine.
Combines results from facial analysis, voice analysis, wearable data,
and medical records to generate a final health risk score and
recommendations for doctors.

This module EXTENDS the existing ai_engine.py without replacing it.
"""

from datetime import datetime

from models.ai_engine import ai_engine
from models.smartwatch_validator import smartwatch_validator
from models.emergency_detector import emergency_detector
from utils.logger import system_logger


class HealthRiskEngine:
    """Combines all AI modules into a unified health risk assessment."""

    # Weight configuration for each data source
    WEIGHTS = {
        'facial_analysis': 0.20,
        'voice_analysis': 0.20,
        'wearable_data': 0.25,
        'medical_records': 0.20,
        'surgery_risk': 0.15,
    }

    def assess(self, patient_id=None, pain_data=None, voice_data=None,
               smartwatch_data=None, medical_records=None, surgery_data=None):
        """Generate comprehensive health risk assessment.

        Combines all available data sources and produces a unified risk score
        with confidence rating and actionable recommendations.
        """
        risk_components = {}
        total_weight = 0
        weighted_risk = 0
        confidence_scores = []
        findings = []

        # 1. Facial Pain Analysis
        if pain_data:
            pain_score = pain_data.get('pain_score', 0)
            pain_confidence = min(95, 60 + pain_score * 3)  # Higher pain = more confident
            risk = (pain_score / 10) * 100
            risk_components['facial_analysis'] = {
                'risk_score': round(risk, 1),
                'confidence': pain_confidence,
                'source': 'Facial Pain Detection',
                'details': f"Pain level: {pain_data.get('pain_info', {}).get('label', 'Unknown')} ({pain_score}/10)",
            }
            weighted_risk += risk * self.WEIGHTS['facial_analysis']
            total_weight += self.WEIGHTS['facial_analysis']
            confidence_scores.append(pain_confidence)
            if pain_score >= 5:
                findings.append({
                    'severity': 'high' if pain_score >= 7 else 'medium',
                    'source': 'Facial Analysis',
                    'finding': f"Significant pain detected (Score: {pain_score}/10)",
                })

        # 2. Voice Analysis
        if voice_data:
            primary = voice_data.get('primary_condition', 'healthy')
            voice_confidence = voice_data.get('confidence', 50)
            voice_risk = 0
            if primary != 'healthy':
                voice_risk = min(voice_confidence, 90)
            risk_components['voice_analysis'] = {
                'risk_score': round(voice_risk, 1),
                'confidence': voice_confidence,
                'source': 'Voice Disease Detection',
                'details': f"Condition: {voice_data.get('primary_info', {}).get('name', primary)} ({voice_confidence}%)",
            }
            weighted_risk += voice_risk * self.WEIGHTS['voice_analysis']
            total_weight += self.WEIGHTS['voice_analysis']
            confidence_scores.append(voice_confidence)
            if primary != 'healthy' and voice_confidence > 40:
                findings.append({
                    'severity': 'high' if voice_confidence > 70 else 'medium',
                    'source': 'Voice Analysis',
                    'finding': f"{voice_data.get('primary_info', {}).get('name', primary)} indicators detected ({voice_confidence}%)",
                })

        # 3. Wearable Data
        if smartwatch_data:
            validation = smartwatch_validator.validate(smartwatch_data)
            watch_risk = 0
            anomaly_count = len(validation.get('anomalies', []))
            critical_count = len([a for a in validation.get('anomalies', []) if a.get('severity') == 'critical'])
            watch_risk = min(anomaly_count * 15 + critical_count * 25, 100)
            watch_confidence = validation.get('confidence', 70)

            risk_components['wearable_data'] = {
                'risk_score': round(watch_risk, 1),
                'confidence': watch_confidence,
                'source': 'Wearable Health Monitor',
                'details': f"{anomaly_count} anomalies detected, {critical_count} critical",
                'anomalies': validation.get('anomalies', []),
                'warnings': validation.get('warnings', []),
            }
            weighted_risk += watch_risk * self.WEIGHTS['wearable_data']
            total_weight += self.WEIGHTS['wearable_data']
            confidence_scores.append(watch_confidence)

            if critical_count > 0:
                for anomaly in validation.get('anomalies', []):
                    if anomaly.get('severity') == 'critical':
                        findings.append({
                            'severity': 'high',
                            'source': 'Wearable Data',
                            'finding': anomaly.get('message', 'Critical anomaly detected'),
                        })

        # 4. Medical Records
        if medical_records:
            conditions = medical_records.get('conditions', [])
            record_risk = min(len(conditions) * 12, 80)
            age = medical_records.get('age', 0)
            if age > 65:
                record_risk += 15
            if age > 80:
                record_risk += 10
            record_risk = min(record_risk, 100)
            record_confidence = 90  # Medical records are reliable

            risk_components['medical_records'] = {
                'risk_score': round(record_risk, 1),
                'confidence': record_confidence,
                'source': 'Medical Records',
                'details': f"{len(conditions)} conditions, Age: {age}",
                'conditions': conditions,
            }
            weighted_risk += record_risk * self.WEIGHTS['medical_records']
            total_weight += self.WEIGHTS['medical_records']
            confidence_scores.append(record_confidence)

        # 5. Surgery Risk
        if surgery_data:
            surgery_risk_level = surgery_data.get('risk_level', 0)
            surgery_risk_score = surgery_risk_level * 40  # 0, 40, 80
            surgery_confidence = surgery_data.get('confidence', 70)

            risk_components['surgery_risk'] = {
                'risk_score': round(surgery_risk_score, 1),
                'confidence': surgery_confidence,
                'source': 'Surgery Risk Prediction',
                'details': surgery_data.get('risk_info', {}).get('level', 'Unknown'),
            }
            weighted_risk += surgery_risk_score * self.WEIGHTS['surgery_risk']
            total_weight += self.WEIGHTS['surgery_risk']
            confidence_scores.append(surgery_confidence)

        # Calculate final scores
        final_risk = round(weighted_risk / total_weight, 1) if total_weight > 0 else 0
        final_risk = min(final_risk, 100)
        health_score = round(100 - final_risk, 1)
        overall_confidence = round(sum(confidence_scores) / len(confidence_scores), 1) if confidence_scores else 0

        # Determine status
        if health_score >= 80:
            status = 'Good'
            status_color = '#10B981'
        elif health_score >= 60:
            status = 'Fair'
            status_color = '#F59E0B'
        elif health_score >= 40:
            status = 'Concerning'
            status_color = '#F97316'
        else:
            status = 'Critical'
            status_color = '#EF4444'

        # Generate recommendations
        recommendations = self._generate_recommendations(findings, health_score, risk_components)

        # Sort findings by severity
        severity_order = {'high': 0, 'medium': 1, 'low': 2}
        findings.sort(key=lambda x: severity_order.get(x['severity'], 3))

        result = {
            'success': True,
            'patient_id': patient_id,
            'timestamp': datetime.now().isoformat(),
            'health_score': health_score,
            'risk_score': final_risk,
            'overall_status': status,
            'status_color': status_color,
            'confidence': overall_confidence,
            'modules_analyzed': len(risk_components),
            'risk_components': risk_components,
            'findings': findings,
            'recommendations': recommendations,
        }

        # Log the assessment
        if patient_id:
            system_logger.log_ai_prediction(
                module='HealthRiskEngine',
                patient_id=patient_id,
                prediction={'health_score': health_score, 'status': status},
                confidence=overall_confidence,
            )

        return result

    def _generate_recommendations(self, findings, health_score, risk_components):
        """Generate prioritized medical recommendations."""
        recs = []

        high_severity = [f for f in findings if f['severity'] == 'high']
        medium_severity = [f for f in findings if f['severity'] == 'medium']

        if high_severity:
            recs.append({
                'priority': 'URGENT',
                'text': 'Immediate medical evaluation required based on critical findings',
                'details': [f['finding'] for f in high_severity],
                'color': '#EF4444'
            })

        if medium_severity:
            recs.append({
                'priority': 'HIGH',
                'text': 'Follow-up examination recommended within 24-48 hours',
                'details': [f['finding'] for f in medium_severity],
                'color': '#F97316'
            })

        if health_score < 50:
            recs.append({
                'priority': 'HIGH',
                'text': 'Comprehensive health assessment strongly recommended',
                'color': '#F97316'
            })
        elif health_score < 70:
            recs.append({
                'priority': 'MEDIUM',
                'text': 'Schedule follow-up within one week',
                'color': '#F59E0B'
            })
        else:
            recs.append({
                'priority': 'LOW',
                'text': 'Continue regular monitoring and routine checkups',
                'color': '#10B981'
            })

        # Module-specific recommendations
        if 'wearable_data' in risk_components:
            wearable = risk_components['wearable_data']
            if wearable['risk_score'] > 30:
                recs.append({
                    'priority': 'MEDIUM',
                    'text': 'Review wearable data anomalies and adjust monitoring frequency',
                    'color': '#F59E0B'
                })

        recs.append({
            'priority': 'INFO',
            'text': 'AI analysis is advisory only. Final diagnosis must be made by qualified healthcare professionals.',
            'color': '#3B82F6'
        })

        return recs


# Singleton
health_risk_engine = HealthRiskEngine()
