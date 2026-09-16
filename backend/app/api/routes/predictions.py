from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models import Equipment, Prediction, SensorReading as SensorReadingRecord
from backend.app.schemas.prediction import (
    ModelInfoResponse,
    PredictionHistoryItem,
    PredictionResponse,
    SensorReading,
    StoredPredictionResponse,
)
from backend.app.services.prediction_service import prediction_service


router = APIRouter(tags=["predictions"])


def _get_equipment_or_404(db: Session, equipment_id: int) -> Equipment:
    equipment = db.get(Equipment, equipment_id)

    if equipment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipment not found.",
        )

    return equipment


@router.get("/model-info", response_model=ModelInfoResponse)
def model_info() -> ModelInfoResponse:
    return prediction_service.get_model_info()


@router.post("/predict", response_model=PredictionResponse)
def predict(reading: SensorReading) -> PredictionResponse:
    return prediction_service.predict(reading)


@router.post(
    "/equipment/{equipment_id}/predict",
    response_model=StoredPredictionResponse,
    status_code=status.HTTP_201_CREATED,
)
def predict_and_store(
    equipment_id: int,
    reading: SensorReading,
    db: Session = Depends(get_db),
) -> StoredPredictionResponse:
    _get_equipment_or_404(db, equipment_id)

    model_result = prediction_service.predict(reading)
    model_info = prediction_service.get_model_info()

    stored_reading = SensorReadingRecord(
        equipment_id=equipment_id,
        **reading.model_dump(),
    )
    db.add(stored_reading)
    db.flush()

    stored_prediction = Prediction(
        sensor_reading_id=stored_reading.id,
        model_name=model_info.model_name,
        failure_probability=model_result.failure_probability,
        threshold=model_result.threshold,
        risk=model_result.risk,
        anomaly_score=model_result.anomaly_score,
        is_anomaly=model_result.is_anomaly,
        anomaly_model_name=model_result.anomaly_model_name,
    )
    db.add(stored_prediction)
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise
    db.refresh(stored_prediction)

    return StoredPredictionResponse(
        prediction_id=stored_prediction.id,
        sensor_reading_id=stored_reading.id,
        equipment_id=equipment_id,
        model_name=stored_prediction.model_name,
        failure_probability=stored_prediction.failure_probability,
        risk=stored_prediction.risk,
        threshold=stored_prediction.threshold,
        anomaly_score=stored_prediction.anomaly_score,
        is_anomaly=stored_prediction.is_anomaly,
        anomaly_model_name=stored_prediction.anomaly_model_name,
        created_at=stored_prediction.created_at,
    )



@router.get(
    "/equipment/{equipment_id}/predictions",
    response_model=list[PredictionHistoryItem],
)
def prediction_history(
    equipment_id: int,
    db: Session = Depends(get_db),
) -> list[PredictionHistoryItem]:
    _get_equipment_or_404(db, equipment_id)

    rows = db.execute(
        select(Prediction, SensorReadingRecord)
        .join(
            SensorReadingRecord,
            Prediction.sensor_reading_id == SensorReadingRecord.id,
        )
        .where(SensorReadingRecord.equipment_id == equipment_id)
        .order_by(SensorReadingRecord.recorded_at.desc())
    ).all()

    return [
        PredictionHistoryItem(
            prediction_id=prediction.id,
            sensor_reading_id=reading.id,
            equipment_id=equipment_id,
            model_name=prediction.model_name,
            failure_probability=prediction.failure_probability,
            risk=prediction.risk,
            threshold=prediction.threshold,
            anomaly_score=prediction.anomaly_score,
            is_anomaly=prediction.is_anomaly,
            anomaly_model_name=prediction.anomaly_model_name,
            recorded_at=reading.recorded_at,
            air_temperature_k=reading.air_temperature_k,
            process_temperature_k=reading.process_temperature_k,
            rotational_speed_rpm=reading.rotational_speed_rpm,
            torque_nm=reading.torque_nm,
            tool_wear_min=reading.tool_wear_min,
        )
        for prediction, reading in rows
    ]
