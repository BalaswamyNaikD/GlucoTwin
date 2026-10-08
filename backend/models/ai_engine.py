"""
AI Decision Engine
Combines results from all diagnostic modules to generate
intelligent alerts and comprehensive recommendations.
"""

import numpy as np
from datetime import datetime


class AIDecisionEngine:
    """Combines active AI analysis modules into unified health intelligence."""

    ALERT_LEVELS = {
        'critical': {'color': '#EF4444', 'icon': '🚨', 'priority': 1},
        'warning': {'color': '#F59E0B', 'icon': '⚠️', 'priority': 2},
        'info': {'color': '#3B82F6', 'icon': 'ℹ️', 'priority': 3},
        'normal': {'color': '#10B981', 'icon': '✅', 'priority': 4},
    }

    def analyze(self, pain_data=None, voice_data=None, surgery_data=None, smartwatch_data=None):
        """Generate combined AI analysis and recommendations."""
        alerts = []
        overall_risk = 0
        modules_analyzed = 0

        # Analyze surgery risk results
        if surgery_data:
            modules_analyzed += 1
            risk_level = surgery_data.get('risk_level', 0)

            if risk_level == 2:
                overall_risk += 35
                alerts.append({
                    'level': 'critical',
                    'module': 'Surgery Risk',
                    'message': 'High surgical risk detected',
                    'action': 'Multi-specialist evaluation required before proceeding',
                    **self.ALERT_LEVELS['critical']
                })
            elif risk_level == 1:
                overall_risk += 18
                alerts.append({
                    'level': 'warning',
                    'module': 'Surgery Risk',
                    'message': 'Moderate surgical risk detected',
                    'action': 'Additional pre-operative assessments recommended',
                    **self.ALERT_LEVELS['warning']
                })
            else:
                alerts.append({
                    'level': 'normal',
                    'module': 'Surgery Risk',
                    'message': 'Surgical risk within acceptable range',
                    'action': 'Standard pre-operative protocol applies',
                    **self.ALERT_LEVELS['normal']
                })

        # Analyze smartwatch data
        if smartwatch_data:
            modules_analyzed += 1
            hr = smartwatch_data.get('heart_rate', 72)
            spo2 = smartwatch_data.get('spo2', 98)
            sleep_hours = smartwatch_data.get('sleep_hours', 7)
            steps = smartwatch_data.get('steps', 5000)

            watch_risk = 0
            if hr > 100 or hr < 50:
                watch_risk += 3
                alerts.append({
                    'level': 'warning',
                    'module': 'Smartwatch',
                    'message': f'Abnormal heart rate detected ({hr} BPM)',
                    'action': 'Cardiac monitoring recommended',
                    **self.ALERT_LEVELS['warning']
                })
            if spo2 < 95:
                watch_risk += 4
                alerts.append({
                    'level': 'critical',
                    'module': 'Smartwatch',
                    'message': f'Low blood oxygen detected (SpO2: {spo2}%)',
                    'action': 'Immediate medical attention may be needed',
                    **self.ALERT_LEVELS['critical']
                })
            if sleep_hours < 5:
                watch_risk += 1
                alerts.append({
                    'level': 'info',
                    'module': 'Smartwatch',
                    'message': f'Poor sleep pattern ({sleep_hours}h)',
                    'action': 'Sleep hygiene counseling recommended',
                    **self.ALERT_LEVELS['info']
                })

            overall_risk += watch_risk * 2.5

        # Sort alerts by priority
        alerts.sort(key=lambda x: self.ALERT_LEVELS.get(x['level'], {}).get('priority', 99))

        # Calculate overall health score (inverse of risk)
        overall_risk = min(overall_risk, 100)
        health_score = max(0, 100 - overall_risk)

        if health_score >= 80:
            overall_status = 'Good'
            status_color = '#10B981'
        elif health_score >= 60:
            overall_status = 'Fair'
            status_color = '#F59E0B'
        elif health_score >= 40:
            overall_status = 'Concerning'
            status_color = '#F97316'
        else:
            overall_status = 'Critical'
            status_color = '#EF4444'

        return {
            'success': True,
            'timestamp': datetime.now().isoformat(),
            'health_score': round(health_score, 1),
            'overall_status': overall_status,
            'status_color': status_color,
            'risk_percentage': round(overall_risk, 1),
            'modules_analyzed': modules_analyzed,
            'alerts': alerts,
            'critical_count': sum(1 for a in alerts if a['level'] == 'critical'),
            'warning_count': sum(1 for a in alerts if a['level'] == 'warning'),
            'recommendations': self._generate_recommendations(alerts, health_score)
        }

    def _generate_recommendations(self, alerts, health_score):
        """Generate prioritized recommendations."""
        recs = []

        critical_alerts = [a for a in alerts if a['level'] == 'critical']
        if critical_alerts:
            recs.append({
                'priority': 'URGENT',
                'text': 'Immediate medical attention recommended based on critical findings',
                'color': '#EF4444'
            })

        if health_score < 50:
            recs.append({
                'priority': 'HIGH',
                'text': 'Comprehensive health evaluation strongly recommended',
                'color': '#F97316'
            })
        elif health_score < 70:
            recs.append({
                'priority': 'MEDIUM',
                'text': 'Schedule follow-up appointment within 1 week',
                'color': '#F59E0B'
            })
        else:
            recs.append({
                'priority': 'LOW',
                'text': 'Continue regular health monitoring and checkups',
                'color': '#10B981'
            })

        recs.append({
            'priority': 'INFO',
            'text': 'AI analysis is advisory only. Always consult qualified healthcare professionals.',
            'color': '#3B82F6'
        })

        return recs


# Singleton instance
ai_engine = AIDecisionEngine()
