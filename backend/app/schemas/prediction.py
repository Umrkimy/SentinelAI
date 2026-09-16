from typing import Literal

from pydantic import BaseModel, Field


class SensorReading(BaseModel):
    air_temperature_k: float
    process_temperature_k: float
    rotational_speed_rpm: float
    torque_nm: float
    tool_wear_min: float


class PredictionResponse(BaseModel):
    failure_probability: float = Field(ge=0, le=1)
    risk: Literal["LOW", "HIGH"]
    threshold: float = Field(ge=0, le=1)


class ModelInfoResponse(BaseModel):
    model_name: str
    feature_names: list[str]
    threshold: float = Field(ge=0, le=1)
