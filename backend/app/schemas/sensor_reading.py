from pydantic import BaseModel, Field


class SensorReadingInput(BaseModel):
    """Sensor values submitted for one equipment assessment."""

    air_temperature_k: float
    process_temperature_k: float
    rotational_speed_rpm: float
    torque_nm: float
    tool_wear_min: float
    operating_cycle: int | None = Field(default=None, ge=1)
