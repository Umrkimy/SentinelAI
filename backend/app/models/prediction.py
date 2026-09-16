from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.session import Base

if TYPE_CHECKING:
    from backend.app.models.sensor_reading import SensorReading


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(primary_key=True)
    sensor_reading_id: Mapped[int] = mapped_column(
        ForeignKey("sensor_readings.id"),
        unique=True,
        index=True,
    )
    model_name: Mapped[str] = mapped_column(String(100))
    failure_probability: Mapped[float] = mapped_column(Float)
    threshold: Mapped[float] = mapped_column(Float)
    risk: Mapped[str] = mapped_column(String(10))
    anomaly_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_anomaly: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    anomaly_model_name: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    sensor_reading: Mapped["SensorReading"] = relationship(
        back_populates="prediction",
    )
