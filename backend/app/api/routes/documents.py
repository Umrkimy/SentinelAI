from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.document import Document

from backend.app.schemas.document_search import (
    DocumentSearchRequest,
    DocumentSearchResponse,
    DocumentListItem,
    DocumentUploadResponse,
)
from backend.app.services.auth_service import get_current_admin
from backend.app.services.document_search_service import (
    DocumentSearchUnavailableError,
    document_search_service,
)
from backend.app.services.document_upload_service import (
    DocumentUploadError,
    store_uploaded_document,
)

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/search", response_model=DocumentSearchResponse)
def search_documents(
    payload: DocumentSearchRequest,
) -> DocumentSearchResponse:
    try:
        results = document_search_service.search(
            query=payload.query,
            top_k=payload.top_k,
        )
    except DocumentSearchUnavailableError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error

    return DocumentSearchResponse(
        query=payload.query,
        results=results,
    )


@router.get("/admin", response_model=list[DocumentListItem])
def list_uploaded_documents(
    _: Annotated[str, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> list[Document]:
    return list(
        db.scalars(select(Document).order_by(Document.created_at.desc())).all()
    )


@router.post(
    "/admin/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    _: Annotated[str, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
    file: Annotated[UploadFile, File(...)],
    source_id: Annotated[
        str,
        Form(min_length=3, max_length=100, pattern=r"^[a-z0-9][a-z0-9-]*$"),
    ],
    title: Annotated[str, Form(min_length=3, max_length=200)],
    purpose: Annotated[str, Form(min_length=3, max_length=500)],
    publisher: Annotated[str | None, Form(max_length=200)] = None,
) -> Document:
    try:
        return await store_uploaded_document(
            db=db,
            upload=file,
            source_id=source_id,
            title=title,
            publisher=publisher,
            purpose=purpose,
            uploaded_by=_,
        )
    except DocumentUploadError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
