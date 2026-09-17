from datetime import datetime

from pydantic import BaseModel, Field


class DocumentSearchRequest(BaseModel):
    query: str = Field(min_length=3, max_length=1_000)
    top_k: int = Field(default=5, ge=1, le=10)


class DocumentSearchResult(BaseModel):
    source_id: str
    title: str
    source_url: str | None
    page_number: int
    chunk_number: int
    text: str
    similarity_score: float


class DocumentSearchResponse(BaseModel):
    query: str
    results: list[DocumentSearchResult]


class DocumentUploadResponse(BaseModel):
    id: int
    source_id: str
    title: str
    original_filename: str
    file_size_bytes: int
    status: str
    created_at: datetime


class DocumentListItem(DocumentUploadResponse):
    publisher: str | None
    purpose: str
    uploaded_by: str
