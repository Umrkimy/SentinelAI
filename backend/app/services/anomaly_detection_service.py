from dataclasses import dataclass

import joblib
import pandas as pd

from backend.app.core.config import ANOMALY_MODEL_PATH
from backend.app.schemas.sensor_reading import SensorReadingInput


@dataclass(frozen=True)
class AnomalyDetectionResult:
    anomaly_score: float
    is_anomaly: bool
    model_name: str


class AnomalyDetectionService:
    """Scores a reading against the Isolation Forest healthy baseline."""

    feature_mapping = {
        "Air temperature [K]": "air_temperature_k",
        "Process temperature [K]": "process_temperature_k",
        "Rotational speed [rpm]": "rotational_speed_rpm",
        "Torque [Nm]": "torque_nm",
        "Tool wear [min]": "tool_wear_min",
    }

    def __init__(self) -> None:
        self.model_bundle = joblib.load(ANOMALY_MODEL_PATH)

    def predict(self, reading: SensorReadingInput) -> AnomalyDetectionResult:
        reading_data = reading.model_dump()
        features = pd.DataFrame(
            [
                {
                    training_name: reading_data[api_name]
                    for training_name, api_name in self.feature_mapping.items()
                }
            ],
            columns=self.model_bundle["feature_names"],
        )
        scaled_features = self.model_bundle["scaler"].transform(features)
        anomaly_score = float(
            -self.model_bundle["model"].decision_function(scaled_features)[0]
        )
        is_anomaly = bool(
            self.model_bundle["model"].predict(scaled_features)[0] == -1
        )

        return AnomalyDetectionResult(
            anomaly_score=round(anomaly_score, 4),
            is_anomaly=is_anomaly,
            model_name=self.model_bundle["model_name"],
        )


anomaly_detection_service = AnomalyDetectionService()
