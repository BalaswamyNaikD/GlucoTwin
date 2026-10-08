"""
Surgery Risk Prediction Module
Uses machine learning to predict surgical risk based on patient parameters.
"""

import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler


class SurgeryRiskPredictor:
    """Predicts surgical risk using patient health parameters."""

    RISK_LEVELS = {
        0: {
            'level': 'Low Risk',
            'color': '#10B981',
            'percentage_range': '0-30%',
            'description': 'Patient is generally fit for surgery with standard precautions.',
            'recommendations': [
                'Standard pre-operative assessment',
                'Routine blood work and imaging',
                'Normal anesthesia protocol',
                'Standard post-operative monitoring'
            ]
        },
        1: {
            'level': 'Medium Risk',
            'color': '#F59E0B',
            'percentage_range': '30-65%',
            'description': 'Patient has moderate risk factors requiring additional precautions.',
            'recommendations': [
                'Enhanced pre-operative assessment',
                'Detailed cardiac evaluation',
                'Anesthesiologist consultation recommended',
                'Extended post-operative monitoring',
                'Consider less invasive alternatives'
            ]
        },
        2: {
            'level': 'High Risk',
            'color': '#EF4444',
            'percentage_range': '65-100%',
            'description': 'Patient has significant risk factors. Surgery requires careful consideration.',
            'recommendations': [
                'Comprehensive multi-specialist evaluation',
                'Full cardiac and pulmonary workup',
                'ICU standby required',
                'Extended post-operative intensive care',
                'Discuss alternative treatment options',
                'Obtain informed consent with detailed risk explanation'
            ]
        }
    }

    def __init__(self):
        self.scaler = StandardScaler()
        self.model = self._build_model()

    def _build_model(self):
        """Build and train a gradient boosting model with synthetic data."""
        np.random.seed(42)
        n = 300

        # Features: age, systolic_bp, diastolic_bp, heart_rate, cholesterol,
        #           bmi, diabetes(0/1), smoking(0/1), previous_surgeries, comorbidity_count

        # Low risk patients
        low_risk = np.column_stack([
            np.random.randint(20, 45, n),                    # age
            np.random.randint(110, 135, n),                  # systolic_bp
            np.random.randint(65, 82, n),                    # diastolic_bp
            np.random.randint(60, 85, n),                    # heart_rate
            np.random.randint(150, 210, n),                  # cholesterol
            np.random.uniform(18.5, 27, n),                  # bmi
            np.random.choice([0, 1], n, p=[0.9, 0.1]),      # diabetes
            np.random.choice([0, 1], n, p=[0.85, 0.15]),    # smoking
            np.random.randint(0, 2, n),                      # previous_surgeries
            np.random.randint(0, 2, n),                      # comorbidity_count
        ])

        # Medium risk patients
        med_risk = np.column_stack([
            np.random.randint(40, 65, n),
            np.random.randint(130, 155, n),
            np.random.randint(80, 95, n),
            np.random.randint(75, 100, n),
            np.random.randint(200, 260, n),
            np.random.uniform(25, 33, n),
            np.random.choice([0, 1], n, p=[0.5, 0.5]),
            np.random.choice([0, 1], n, p=[0.55, 0.45]),
            np.random.randint(1, 4, n),
            np.random.randint(1, 4, n),
        ])

        # High risk patients
        high_risk = np.column_stack([
            np.random.randint(60, 90, n),
            np.random.randint(150, 190, n),
            np.random.randint(90, 110, n),
            np.random.randint(90, 130, n),
            np.random.randint(240, 320, n),
            np.random.uniform(30, 42, n),
            np.random.choice([0, 1], n, p=[0.2, 0.8]),
            np.random.choice([0, 1], n, p=[0.3, 0.7]),
            np.random.randint(2, 6, n),
            np.random.randint(3, 7, n),
        ])

        X = np.vstack([low_risk, med_risk, high_risk]).astype(float)
        y = np.array([0] * n + [1] * n + [2] * n)

        X = self.scaler.fit_transform(X)

        model = GradientBoostingClassifier(n_estimators=100, random_state=42, max_depth=5)
        model.fit(X, y)
        return model

    def predict(self, patient_data):
        """Predict surgery risk for a patient."""
        try:
            features = np.array([
                patient_data.get('age', 50),
                patient_data.get('systolic_bp', 120),
                patient_data.get('diastolic_bp', 80),
                patient_data.get('heart_rate', 72),
                patient_data.get('cholesterol', 200),
                patient_data.get('bmi', 25),
                1 if patient_data.get('diabetes', False) else 0,
                1 if patient_data.get('smoking', False) else 0,
                patient_data.get('previous_surgeries', 0),
                patient_data.get('comorbidity_count', 0),
            ]).astype(float).reshape(1, -1)

            features_scaled = self.scaler.transform(features)
            prediction = int(self.model.predict(features_scaled)[0])
            probabilities = self.model.predict_proba(features_scaled)[0]

            risk_info = self.RISK_LEVELS[prediction]
            risk_percentage = round(float(probabilities[prediction]) * 100, 1)

            # Feature importance analysis
            feature_names = [
                'Age', 'Systolic BP', 'Diastolic BP', 'Heart Rate',
                'Cholesterol', 'BMI', 'Diabetes', 'Smoking',
                'Previous Surgeries', 'Comorbidities'
            ]
            importances = self.model.feature_importances_
            risk_factors = []
            for fname, imp in sorted(zip(feature_names, importances), key=lambda x: x[1], reverse=True):
                risk_factors.append({
                    'factor': fname,
                    'importance': round(float(imp) * 100, 1)
                })

            return {
                'success': True,
                'risk_level': prediction,
                'risk_info': risk_info,
                'confidence': risk_percentage,
                'probabilities': {
                    'low': round(float(probabilities[0]) * 100, 1),
                    'medium': round(float(probabilities[1]) * 100, 1),
                    'high': round(float(probabilities[2]) * 100, 1),
                },
                'risk_factors': risk_factors,
                'patient_summary': self._generate_summary(patient_data, prediction)
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'risk_level': 1,
                'risk_info': self.RISK_LEVELS[1]
            }

    def _generate_summary(self, data, risk_level):
        """Generate a patient summary."""
        concerns = []
        if data.get('age', 0) > 65:
            concerns.append('Advanced age (>65)')
        if data.get('systolic_bp', 0) > 140:
            concerns.append('Elevated blood pressure')
        if data.get('cholesterol', 0) > 240:
            concerns.append('High cholesterol')
        if data.get('diabetes'):
            concerns.append('Diabetes present')
        if data.get('smoking'):
            concerns.append('Active smoker')
        if data.get('bmi', 0) > 30:
            concerns.append('Obesity (BMI > 30)')
        if data.get('comorbidity_count', 0) >= 3:
            concerns.append('Multiple comorbidities')

        return {
            'total_concerns': len(concerns),
            'concerns': concerns,
            'clearance': 'Cleared for surgery' if risk_level == 0 else 'Additional evaluation needed' if risk_level == 1 else 'High-risk consultation required'
        }


# Singleton instance
surgery_risk_predictor = SurgeryRiskPredictor()
