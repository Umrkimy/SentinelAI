from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class AssessmentResponse(BaseModel):
    failure_probability: float = Field(ge=0, le=1)
    risk: Literal["LOW", "HIGH"]
    threshold: float = Field(ge=0, le=1)
    anomaly_score: float
    is_anomaly: bool
    anomaly_model_name: str
    predicted_rul_cycles: float | None = None
    conservative_rul_cycles: float | None = None
    rul_model_name: str | None = None
    rul_training_data_note: str | None = None


class FailureModelInfoResponse(BaseModel):
    model_name: str
    feature_names: list[str]
    threshold: float = Field(ge=0, le=1)


class StoredAssessmentResponse(AssessmentResponse):
    prediction_id: int
    sensor_reading_id: int
    equipment_id: int
    model_name: str
    created_at: datetime


class AssessmentHistoryItem(AssessmentResponse):
    anomaly_score: float | None = None
    is_anomaly: bool | None = None
    anomaly_model_name: str | None = None
    prediction_id: int
    sensor_reading_id: int
    equipment_id: int
    model_name: str
    recorded_at: datetime
    air_temperature_k: float
    process_temperature_k: float
    rotational_speed_rpm: float
    torque_nm: float
    tool_wear_min: float
    operating_cycle: int | None
