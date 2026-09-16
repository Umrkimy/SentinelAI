from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.session import Base

if TYPE_CHECKING:
    from backend.app.models.sensor_reading import SensorReading

class Equipment(Base):
    __tablename__ = "equipment"

    id: Mapped[int] = mapped_column(primary_key=True)
    asset_tag: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    machine_type: Mapped[str] = mapped_column(String(100))
    location: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    readings: Mapped[list["SensorReading"]] = relationship(
        back_populates="equipment",
        cascade="all, delete-orphan",
    )
