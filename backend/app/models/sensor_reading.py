from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.session import Base

if TYPE_CHECKING:
    from backend.app.models.equipment import Equipment
    from backend.app.models.prediction import Prediction

class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id: Mapped[int] = mapped_column(primary_key=True)
    equipment_id: Mapped[int] = mapped_column(
        ForeignKey("equipment.id"),
        index=True,
    )
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
    )
    air_temperature_k: Mapped[float] = mapped_column(Float)
    process_temperature_k: Mapped[float] = mapped_column(Float)
    rotational_speed_rpm: Mapped[float] = mapped_column(Float)
    torque_nm: Mapped[float] = mapped_column(Float)
    tool_wear_min: Mapped[float] = mapped_column(Float)
    operating_cycle: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    source: Mapped[str] = mapped_column(String(50), default="manual")

    equipment: Mapped["Equipment"] = relationship(
        back_populates="readings",
    )
    prediction: Mapped["Prediction | None"] = relationship(
        back_populates="sensor_reading",
        cascade="all, delete-orphan",
        uselist=False,
    )
