"""
Smartwatch Data Validation Module.
Detects abnormal patterns in wearable health data including:
- Sudden heart rate spikes
- Unusual sleep patterns
- Long inactivity periods
- Anomalous vital readings
"""

from datetime import datetime


class SmartwatchValidator:
    """Validates and analyzes smartwatch/wearable health data for anomalies."""

    # Normal ranges for wearable metrics
    NORMAL_RANGES = {
        'heart_rate': {'min': 50, 'max': 100, 'unit': 'BPM'},
        'spo2': {'min': 95, 'max': 100, 'unit': '%'},
        'temperature': {'min': 96.8, 'max': 99.5, 'unit': '°F'},
        'steps': {'min': 0, 'max': 40000, 'unit': 'steps'},
        'sleep_hours': {'min': 4, 'max': 10, 'unit': 'hours'},
        'calories': {'min': 100, 'max': 5000, 'unit': 'kcal'},
        'respiration_rate': {'min': 12, 'max': 20, 'unit': 'breaths/min'},
        'blood_glucose': {'min': 70, 'max': 140, 'unit': 'mg/dL'},
    }

    # Spike thresholds (% change from baseline considered a spike)
    SPIKE_THRESHOLDS = {
        'heart_rate': 40,   # 40% increase
        'spo2': 8,          # 8% decrease
        'temperature': 2,   # 2°F increase
        'blood_glucose': 50, # 50% increase
    }

    def validate(self, data, previous_data=None):
        """Validate smartwatch data and detect anomalies.

        Args:
            data: Current smartwatch readings dict
            previous_data: Previous readings for trend comparison

        Returns:
            Validation result with anomalies, warnings, and data quality score
        """
        anomalies = []
        warnings = []
        validated_data = {}

        # Validate each metric
        for metric, ranges in self.NORMAL_RANGES.items():
            value = data.get(metric)
            if value is None:
                continue

            validated_data[metric] = value
            status = 'normal'

            # Range check
            if value < ranges['min']:
                status = 'low'
                severity = 'warning' if value >= ranges['min'] * 0.8 else 'critical'
                anomalies.append({
                    'metric': metric,
                    'value': value,
                    'expected_range': f"{ranges['min']}-{ranges['max']} {ranges['unit']}",
                    'status': 'below_normal',
                    'severity': severity,
                    'message': f"{metric.replace('_', ' ').title()} is below normal: {value} {ranges['unit']}"
                })
            elif value > ranges['max']:
                status = 'high'
                severity = 'warning' if value <= ranges['max'] * 1.3 else 'critical'
                anomalies.append({
                    'metric': metric,
                    'value': value,
                    'expected_range': f"{ranges['min']}-{ranges['max']} {ranges['unit']}",
                    'status': 'above_normal',
                    'severity': severity,
                    'message': f"{metric.replace('_', ' ').title()} is above normal: {value} {ranges['unit']}"
                })

        # Spike detection (compare with previous data)
        spikes = []
        if previous_data:
            spikes = self._detect_spikes(data, previous_data)
            anomalies.extend(spikes)

        # Sleep pattern analysis
        sleep_issues = self._analyze_sleep(data)
        if sleep_issues:
            warnings.extend(sleep_issues)

        # Inactivity detection
        inactivity = self._detect_inactivity(data)
        if inactivity:
            warnings.append(inactivity)

        # Calculate data quality score
        expected_metrics = len(self.NORMAL_RANGES)
        available_metrics = len(validated_data)
        data_quality = round((available_metrics / expected_metrics) * 100, 1)

        return {
            'valid': len([a for a in anomalies if a.get('severity') == 'critical']) == 0,
            'anomalies': anomalies,
            'warnings': warnings,
            'spikes_detected': len(spikes),
            'data_quality': data_quality,
            'metrics_analyzed': available_metrics,
            'validated_data': validated_data,
            'timestamp': datetime.now().isoformat(),
            'has_critical': any(a.get('severity') == 'critical' for a in anomalies),
            'confidence': min(data_quality, 100.0),
        }

    def _detect_spikes(self, current, previous):
        """Detect sudden spikes in vital signs."""
        spikes = []
        for metric, threshold_pct in self.SPIKE_THRESHOLDS.items():
            curr_val = current.get(metric)
            prev_val = previous.get(metric)
            if curr_val is None or prev_val is None or prev_val == 0:
                continue

            change_pct = abs((curr_val - prev_val) / prev_val) * 100

            if change_pct >= threshold_pct:
                direction = 'spike' if curr_val > prev_val else 'drop'
                spikes.append({
                    'metric': metric,
                    'value': curr_val,
                    'previous_value': prev_val,
                    'change_percent': round(change_pct, 1),
                    'direction': direction,
                    'status': f'sudden_{direction}',
                    'severity': 'critical' if change_pct >= threshold_pct * 1.5 else 'warning',
                    'message': f"Sudden {metric.replace('_', ' ')} {direction}: {prev_val} → {curr_val} ({change_pct:.1f}% change)"
                })
        return spikes

    def _analyze_sleep(self, data):
        """Analyze sleep patterns for abnormalities."""
        issues = []
        sleep_hours = data.get('sleep_hours')

        if sleep_hours is not None:
            if sleep_hours < 3:
                issues.append({
                    'type': 'sleep',
                    'severity': 'critical',
                    'message': f'Severely insufficient sleep: {sleep_hours} hours',
                    'recommendation': 'Sleep deprivation may affect health; consult physician'
                })
            elif sleep_hours < 5:
                issues.append({
                    'type': 'sleep',
                    'severity': 'warning',
                    'message': f'Poor sleep: {sleep_hours} hours',
                    'recommendation': 'Consider sleep hygiene improvements'
                })
            elif sleep_hours > 12:
                issues.append({
                    'type': 'sleep',
                    'severity': 'warning',
                    'message': f'Excessive sleep: {sleep_hours} hours',
                    'recommendation': 'Excessive sleep may indicate underlying conditions'
                })

        sleep_quality = data.get('sleep_quality')
        if sleep_quality is not None and sleep_quality < 40:
            issues.append({
                'type': 'sleep_quality',
                'severity': 'warning',
                'message': f'Poor sleep quality score: {sleep_quality}%',
                'recommendation': 'Consider sleep study or lifestyle adjustments'
            })

        return issues

    def _detect_inactivity(self, data):
        """Detect prolonged inactivity periods."""
        steps = data.get('steps', None)
        active_minutes = data.get('active_minutes', None)

        if steps is not None and steps < 100:
            return {
                'type': 'inactivity',
                'severity': 'warning',
                'message': f'Very low activity: only {steps} steps recorded',
                'recommendation': 'Extended inactivity detected; check patient well-being',
                'value': steps,
            }

        if active_minutes is not None and active_minutes < 5:
            return {
                'type': 'inactivity',
                'severity': 'warning',
                'message': f'Minimal active time: {active_minutes} minutes',
                'recommendation': 'Patient may be sedentary or immobile; wellness check recommended',
                'value': active_minutes,
            }

        return None


# Singleton
smartwatch_validator = SmartwatchValidator()
