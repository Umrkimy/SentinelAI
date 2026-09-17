from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.db.session import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    source_id: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(200))
    publisher: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )
    purpose: Mapped[str] = mapped_column(String(500))
    original_filename: Mapped[str] = mapped_column(String(255))
    stored_filename: Mapped[str] = mapped_column(
        String(255),
        unique=True,
    )
    content_sha256: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        index=True,
    )
    file_size_bytes: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(
        String(30),
        default="pending_validation",
    )
    uploaded_by: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )