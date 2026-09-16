from fastapi import APIRouter

from backend.app.schemas.prediction import (
    ModelInfoResponse,
    PredictionResponse,
    SensorReading,
)
from backend.app.services.prediction_service import prediction_service


router = APIRouter(tags=["predictions"])


@router.get("/model-info", response_model=ModelInfoResponse)
def model_info() -> ModelInfoResponse:
    return prediction_service.get_model_info()


@router.post("/predict", response_model=PredictionResponse)
def predict(reading: SensorReading) -> PredictionResponse:
    return prediction_service.predict(reading)
