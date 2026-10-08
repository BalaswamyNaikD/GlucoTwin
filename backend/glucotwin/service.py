import json
import os
import threading
from typing import Any, Dict, List

import joblib
import numpy as np
import pandas as pd


class GlucoTwinError(Exception):
    """Expected service error that can be shown safely to API clients."""


class GlucoTwinService:
    RISK_TARGET = "Glucose rise >= 30 mg/dL within next 2 hours"
    MODEL_NAME = "GlucoTwin Random Forest"

    def __init__(self, base_dir: str):
        self.base_dir = base_dir
        self.model_path = os.path.join(base_dir, "model", "glucotwin_model.pkl")
        self.dataset_path = os.path.join(base_dir, "data", "final_training_dataset.csv")
        self.metrics_path = os.path.join(base_dir, "model", "metrics.json")
        self._lock = threading.Lock()
        self._positions: Dict[Any, int] = {}
        self._load_resources()

    def _load_resources(self) -> None:
        try:
            self.model = joblib.load(self.model_path)
        except Exception as exc:
            raise GlucoTwinError("The GlucoTwin model is unavailable.") from exc
        try:
            self.dataset = pd.read_csv(self.dataset_path)
        except Exception as exc:
            raise GlucoTwinError("The GlucoTwin simulation dataset is unavailable.") from exc
        if self.dataset.empty or "patient_id" not in self.dataset.columns:
            raise GlucoTwinError("The GlucoTwin simulation dataset is empty or invalid.")
        self.feature_names = list(getattr(self.model, "feature_names_in_", []))
        if not self.feature_names:
            raise GlucoTwinError("The GlucoTwin model does not declare its input features.")
        missing = [name for name in self.feature_names if name not in self.dataset.columns]
        if missing:
            raise GlucoTwinError("The GlucoTwin dataset is missing required model features.")
        try:
            with open(self.metrics_path, encoding="utf-8") as metrics_file:
                self.metrics = json.load(metrics_file)
        except (OSError, ValueError) as exc:
            raise GlucoTwinError("The GlucoTwin model metadata is unavailable.") from exc
        self._patients = sorted(self.dataset["patient_id"].dropna().unique().tolist())
        if not self._patients:
            raise GlucoTwinError("No GlucoTwin patients are available.")
        self._groups = {
            patient_id: group.reset_index(drop=True)
            for patient_id, group in self.dataset.groupby("patient_id", sort=False)
        }

    def patients(self) -> List[Dict[str, Any]]:
        return [
            {
                "patient_id": self._json_value(patient_id),
                "observations": len(self._groups[patient_id]),
                "sex": self._json_value(self._groups[patient_id].iloc[0]["sex"]),
                "hba1c": self._json_value(self._groups[patient_id].iloc[0]["hba1c"]),
            }
            for patient_id in self._patients
        ]

    def reset(self, patient_id: str) -> Dict[str, Any]:
        patient = self._resolve_patient(patient_id)
        with self._lock:
            self._positions[patient] = 0
        return {"patient_id": self._json_value(patient), "current_position": 0}

    def live(self, patient_id: str) -> Dict[str, Any]:
        patient = self._resolve_patient(patient_id)
        with self._lock:
            group = self._groups[patient]
            position = self._positions.get(patient, 0)
            row = group.iloc[position]
            self._positions[patient] = (position + 1) % len(group)
        try:
            values = row[self.feature_names].to_frame().T
            if values.isna().any().any():
                raise GlucoTwinError("The selected observation has incomplete model features.")
            probability = self._risk_probability(values)
        except GlucoTwinError:
            raise
        except Exception as exc:
            raise GlucoTwinError("The GlucoTwin model could not generate a prediction.") from exc

        probability = float(np.clip(probability, 0.0, 1.0))
        return {
            "patient_id": self._json_value(patient),
            "timestamp": str(row["timestamp"]),
            "sensor": {
                "glucose_mg_dl": self._number(row["glucose"]),
                "heart_rate_bpm": self._number(row["hr_mean"]),
                "ibi_ms": self._number(row["ibi_mean"], multiplier=1000),
            },
            "historical": {
                "sex": self._json_value(row["sex"]),
                "hba1c": self._number(row["hba1c"]),
            },
            "prediction": {
                "risk_probability": probability,
                "risk_percent": round(probability * 100, 2),
                "risk_level": self._risk_level(probability),
                "prediction_window": "Next 2 hours",
                "target": self.RISK_TARGET,
            },
            "simulation": {
                "mode": "Simulated Live Sensor Stream",
                "source": "Open-source CGM and wearable observations",
                "current_position": position + 1,
                "total_observations": len(group),
            },
            "model": {
                "model_name": self.MODEL_NAME,
                "feature_count": len(self.feature_names),
            },
        }

    def metadata(self) -> Dict[str, Any]:
        return {
            "model_name": self.MODEL_NAME,
            "feature_count": len(self.feature_names),
            "metrics": self.metrics.get("final_unseen_test_metrics", {}),
        }

    def _resolve_patient(self, patient_id: str) -> Any:
        try:
            requested = int(patient_id)
        except (TypeError, ValueError) as exc:
            raise GlucoTwinError("Invalid GlucoTwin patient ID.") from exc
        for available in self._patients:
            if str(available) == str(requested):
                return available
        raise GlucoTwinError("The requested GlucoTwin patient was not found.")

    def _risk_probability(self, values: pd.DataFrame) -> float:
        if hasattr(self.model, "predict_proba"):
            probabilities = self.model.predict_proba(values)[0]
            classes = list(getattr(self.model, "classes_", range(len(probabilities))))
            return float(probabilities[classes.index(1)]) if 1 in classes else float(probabilities[-1])
        prediction = self.model.predict(values)[0]
        return float(prediction)

    @staticmethod
    def _risk_level(probability: float) -> str:
        if probability >= 0.75:
            return "HIGH"
        if probability >= 0.40:
            return "MEDIUM"
        return "LOW"

    @staticmethod
    def _number(value: Any, multiplier: float = 1) -> float:
        number = float(value) * multiplier
        if not np.isfinite(number):
            raise GlucoTwinError("The selected observation contains invalid sensor data.")
        return round(number, 4)

    @staticmethod
    def _json_value(value: Any) -> Any:
        return value.item() if hasattr(value, "item") else value


glucotwin_service = GlucoTwinService(os.path.dirname(__file__))
