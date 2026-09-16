import joblib
import pandas as pd

from backend.app.core.config import MODEL_PATH
from backend.app.schemas.prediction import (
    ModelInfoResponse,
    PredictionResponse,
    SensorReading,
)


class PredictionService:
    def __init__(self) -> None:
        self.model_bundle = joblib.load(MODEL_PATH)

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

        return PredictionResponse(
            failure_probability=round(failure_probability, 4),
            risk="HIGH" if failure_probability >= threshold else "LOW",
            threshold=threshold,
        )


prediction_service = PredictionService()
