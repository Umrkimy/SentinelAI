from dataclasses import dataclass

import joblib
import pandas as pd

from backend.app.core.config import RUL_MODEL_PATH
from backend.app.schemas.sensor_reading import SensorReadingInput


@dataclass(frozen=True)
class RULPredictionResult:
    predicted_rul_cycles: float
    conservative_rul_cycles: float
    model_name: str
    training_data_note: str


class RULPredictionService:
    """Estimates remaining useful life from synthetic lifecycle training data."""

    def __init__(self) -> None:
        self.model_bundle = joblib.load(RUL_MODEL_PATH)

    def predict(self, reading: SensorReadingInput) -> RULPredictionResult | None:
        if reading.operating_cycle is None:
            return None

        feature_values = reading.model_dump()
        feature_values["cycle"] = reading.operating_cycle
        features = pd.DataFrame(
            [feature_values],
            columns=self.model_bundle["feature_names"],
        )
        predicted_rul = max(
            0.0,
            float(self.model_bundle["model"].predict(features)[0]),
        )
        conservative_rul = max(
            0.0,
            predicted_rul - self.model_bundle["safety_buffer_cycles"],
        )

        return RULPredictionResult(
            predicted_rul_cycles=round(predicted_rul, 1),
            conservative_rul_cycles=round(conservative_rul, 1),
            model_name=self.model_bundle["model_name"],
            training_data_note=self.model_bundle["training_data_note"],
        )


rul_prediction_service = RULPredictionService()
