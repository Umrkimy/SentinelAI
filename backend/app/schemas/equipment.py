from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class EquipmentCreate(BaseModel):
    asset_tag: str = Field(min_length=1, max_length=50)
    machine_type: str = Field(min_length=1, max_length=100)
    location: str | None = Field(default=None, max_length=100)


class EquipmentResponse(BaseModel):
    id: int
    asset_tag: str
    machine_type: str
    location: str | None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)