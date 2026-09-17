from hashlib import sha256
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.core.config import DOCUMENT_UPLOADS_DIR
from backend.app.models.document import Document
from backend.app.services.document_validation_service import (
    MAX_DOCUMENT_BYTES,
    DocumentValidationError,
    validate_pdf_for_indexing,
)


class DocumentUploadError(ValueError):
    """Raised when an uploaded reference document cannot be safely stored."""


async def store_uploaded_document(
    *,
    db: Session,
    upload: UploadFile,
    source_id: str,
    title: str,
    publisher: str | None,
    purpose: str,
    uploaded_by: str,
) -> Document:
    """Stream, validate, deduplicate, and privately store an admin PDF upload."""
    original_filename = Path(upload.filename or "document.pdf").name
    if not original_filename.lower().endswith(".pdf"):
        raise DocumentUploadError("Only PDF files are allowed.")

    uploads_dir = DOCUMENT_UPLOADS_DIR
    temporary_dir = uploads_dir / ".temporary"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    temporary_dir.mkdir(parents=True, exist_ok=True)

    temporary_path = temporary_dir / f"{uuid4().hex}.pdf"
    content_digest = sha256()
    file_size = 0

    try:
        with temporary_path.open("wb") as temporary_file:
            while chunk := await upload.read(1_048_576):
                file_size += len(chunk)
                if file_size > MAX_DOCUMENT_BYTES:
                    raise DocumentUploadError(
                        f"PDFs must be at most {MAX_DOCUMENT_BYTES // 1024 // 1024} MB."
                    )
                content_digest.update(chunk)
                temporary_file.write(chunk)

        if file_size == 0:
            raise DocumentUploadError("The uploaded PDF is empty.")

        try:
            validate_pdf_for_indexing(temporary_path)
        except DocumentValidationError as error:
            raise DocumentUploadError(str(error)) from error

        content_sha256 = content_digest.hexdigest()
        duplicate = db.scalar(
            select(Document).where(
                (Document.source_id == source_id)
                | (Document.content_sha256 == content_sha256)
            )
        )
        if duplicate is not None:
            raise DocumentUploadError(
                "This source ID or document content already exists."
            )

        stored_filename = f"{uuid4().hex}.pdf"
        stored_path = uploads_dir / stored_filename
        temporary_path.replace(stored_path)

        document = Document(
            source_id=source_id,
            title=title,
            publisher=publisher or None,
            purpose=purpose,
            original_filename=original_filename,
            stored_filename=stored_filename,
            content_sha256=content_sha256,
            file_size_bytes=file_size,
            status="ready",
            uploaded_by=uploaded_by,
        )
        db.add(document)
        try:
            db.commit()
        except IntegrityError as error:
            db.rollback()
            stored_path.unlink(missing_ok=True)
            raise DocumentUploadError(
                "This source ID or document content already exists."
            ) from error

        db.refresh(document)
        return document
    finally:
        await upload.close()
        temporary_path.unlink(missing_ok=True)
