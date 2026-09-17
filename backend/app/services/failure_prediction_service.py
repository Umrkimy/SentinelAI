from dataclasses import dataclass

import joblib
import pandas as pd

from backend.app.core.config import MODEL_PATH
from backend.app.schemas.assessment import FailureModelInfoResponse
from backend.app.schemas.sensor_reading import SensorReadingInput


@dataclass(frozen=True)
class FailurePredictionResult:
    failure_probability: float
    risk: str
    threshold: float
    model_name: str


class FailurePredictionService:
    """Scores the supervised XGBoost failure-risk model."""

    def __init__(self) -> None:
        self.model_bundle = joblib.load(MODEL_PATH)

    def get_model_info(self) -> FailureModelInfoResponse:
        return FailureModelInfoResponse(
            model_name=self.model_bundle["model_name"],
            feature_names=self.model_bundle["feature_names"],
            threshold=self.model_bundle["threshold"],
        )

    def predict(self, reading: SensorReadingInput) -> FailurePredictionResult:
        features = pd.DataFrame(
            [reading.model_dump()],
            columns=self.model_bundle["feature_names"],
        )
        failure_probability = float(
            self.model_bundle["model"].predict_proba(features)[0, 1]
        )
        threshold = self.model_bundle["threshold"]

        return FailurePredictionResult(
            failure_probability=round(failure_probability, 4),
            risk="HIGH" if failure_probability >= threshold else "LOW",
            threshold=threshold,
            model_name=self.model_bundle["model_name"],
        )


failure_prediction_service = FailurePredictionService()
