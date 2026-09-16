import joblib
import pandas as pd

from backend.app.core.config import ANOMALY_MODEL_PATH, MODEL_PATH
from backend.app.schemas.prediction import (
    ModelInfoResponse,
    PredictionResponse,
    SensorReading,
)


class PredictionService:
    def __init__(self) -> None:
        self.model_bundle = joblib.load(MODEL_PATH)
        self.anomaly_model_bundle = joblib.load(ANOMALY_MODEL_PATH)

        self.anomaly_feature_mapping = {
            "Air temperature [K]": "air_temperature_k",
            "Process temperature [K]": "process_temperature_k",
            "Rotational speed [rpm]": "rotational_speed_rpm",
            "Torque [Nm]": "torque_nm",
            "Tool wear [min]": "tool_wear_min",
        }

    def get_model_info(self) -> ModelInfoResponse:
        return ModelInfoResponse(
            model_name=self.model_bundle["model_name"],
            feature_names=self.model_bundle["feature_names"],
            threshold=self.model_bundle["threshold"],
        )

    def predict(self, reading: SensorReading) -> PredictionResponse:
        features = pd.DataFrame(
            [reading.model_dump()],
            columns=self.model_bundle["feature_names"],
        )
        failure_probability = float(
            self.model_bundle["model"].predict_proba(features)[0, 1]
        )
        threshold = self.model_bundle["threshold"]

        reading_data = reading.model_dump()
        anomaly_features = pd.DataFrame(
            [
                {
                    training_name: reading_data[api_name]
                    for training_name, api_name in self.anomaly_feature_mapping.items()
                }
            ],
            columns=self.anomaly_model_bundle["feature_names"],
        )
        anomaly_scaled = self.anomaly_model_bundle["scaler"].transform(
            anomaly_features
        )
        anomaly_score = float(
            -self.anomaly_model_bundle["model"].decision_function(anomaly_scaled)[0]
        )
        is_anomaly = bool(
            self.anomaly_model_bundle["model"].predict(anomaly_scaled)[0] == -1
        )

        return PredictionResponse(
            failure_probability=round(failure_probability, 4),
            risk="HIGH" if failure_probability >= threshold else "LOW",
            threshold=threshold,
            anomaly_score=round(anomaly_score, 4),
            is_anomaly=is_anomaly,
            anomaly_model_name=self.anomaly_model_bundle["model_name"],
        )


prediction_service = PredictionService()
