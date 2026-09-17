import json
from hashlib import sha256
from pathlib import Path

import joblib
import numpy as np
import pymupdf
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy import select

from backend.app.core.config import (
    DOCUMENTS_DIR,
    DOCUMENT_INDEX_PATH,
    DOCUMENT_SOURCES_PATH,
    DOCUMENT_UPLOADS_DIR,
)
from backend.app.db.session import SessionLocal
from backend.app.models.document import Document
from backend.app.schemas.document_search import DocumentSearchResult
from backend.app.services.document_validation_service import (
    DocumentValidationError,
    validate_open_pdf,
    validate_pdf_file,
)


class DocumentSearchUnavailableError(RuntimeError):
    """Raised when the local document index cannot be built."""


class DocumentSearchService:
    model_name = "sentence-transformers/all-MiniLM-L6-v2"
    cache_format_version = 2

    def __init__(self) -> None:
        self._is_ready = False
        self._embedding_model: SentenceTransformer | None = None
        self._embeddings: np.ndarray | None = None
        self._tfidf_vectorizer: TfidfVectorizer | None = None
        self._tfidf_matrix = None
        self._chunks: list[dict] = []
        self._loaded_fingerprint: str | None = None

    @staticmethod
    def _split_text(
        text: str,
        chunk_size: int = 900,
        overlap: int = 150,
    ) -> list[str]:
        chunks = []
        start = 0

        while start < len(text):
            end = min(start + chunk_size, len(text))
            chunk = text[start:end].strip()

            if chunk:
                chunks.append(chunk)

            if end == len(text):
                break

            start = end - overlap

        return chunks

    @staticmethod
    def _scale_to_zero_one(scores: np.ndarray) -> np.ndarray:
        score_range = scores.max() - scores.min()

        if score_range == 0:
            return np.ones_like(scores)

        return (scores - scores.min()) / score_range

    @staticmethod
    def _expand_safety_query(query: str) -> str:
        safety_terms = (
            "reenerg",
            "deenerg",
            "lockout",
            "tagout",
            "isolate",
            "hazardous energy",
        )

        if any(term in query.lower() for term in safety_terms):
            return (
                f"{query} lockout tagout hazardous energy "
                "energy control procedure"
            )

        return query

    def _load_sources(self) -> list[dict]:
        if not DOCUMENT_SOURCES_PATH.exists():
            raise DocumentSearchUnavailableError(
                f"Source register not found: {DOCUMENT_SOURCES_PATH}"
            )

        sources = json.loads(
            DOCUMENT_SOURCES_PATH.read_text(encoding="utf-8")
        )["sources"]

        with SessionLocal() as db:
            uploaded_documents = db.scalars(
                select(Document).where(Document.status == "ready")
            ).all()

        sources.extend(
            {
                "id": document.source_id,
                "title": document.title,
                "source_url": None,
                "purpose": document.purpose,
                "pdf_path": str(
                    DOCUMENT_UPLOADS_DIR / document.stored_filename
                ),
            }
            for document in uploaded_documents
        )
        return sources

    @staticmethod
    def _pdf_path(source: dict) -> Path:
        if "pdf_path" in source:
            return Path(source["pdf_path"])
        return DOCUMENTS_DIR / source["local_file"]

    def _load_chunks(self) -> list[dict]:
        sources = self._load_sources()

        chunks = []

        for source in sources:
            pdf_path = self._pdf_path(source)

            if not pdf_path.exists():
                raise DocumentSearchUnavailableError(
                    f"Document not found: {pdf_path}"
                )

            try:
                validate_pdf_file(pdf_path)
                with pymupdf.open(pdf_path) as pdf:
                    validate_open_pdf(pdf)

                    for page_number, page in enumerate(pdf, start=1):
                        page_text = page.get_text().strip()

                        for chunk_number, text in enumerate(
                            self._split_text(page_text),
                            start=1,
                        ):
                            chunks.append(
                                {
                                    "source_id": source["id"],
                                    "title": source["title"],
                                    "source_url": source["source_url"],
                                    "purpose": source["purpose"],
                                    "page_number": page_number,
                                    "chunk_number": chunk_number,
                                    "text": text,
                                }
                            )
            except DocumentValidationError as error:
                raise DocumentSearchUnavailableError(str(error)) from error

        if not chunks:
            raise DocumentSearchUnavailableError(
                "No readable PDF text was found."
            )

        return chunks

    def _source_fingerprint(self) -> str:
        """Return a content fingerprint so stale caches are never reused."""
        if not DOCUMENT_SOURCES_PATH.exists():
            raise DocumentSearchUnavailableError(
                f"Source register not found: {DOCUMENT_SOURCES_PATH}"
            )

        digest = sha256(DOCUMENT_SOURCES_PATH.read_bytes())
        sources = self._load_sources()

        for source in sources:
            pdf_path = self._pdf_path(source)
            if not pdf_path.exists():
                raise DocumentSearchUnavailableError(
                    f"Document not found: {pdf_path}"
                )

            digest.update(source["id"].encode("utf-8"))
            with pdf_path.open("rb") as pdf_file:
                for block in iter(lambda: pdf_file.read(1_048_576), b""):
                    digest.update(block)

        return digest.hexdigest()

    def _load_embedding_model(self) -> SentenceTransformer:
        return SentenceTransformer(self.model_name)

    def _load_cached_index(self, source_fingerprint: str) -> bool:
        if not DOCUMENT_INDEX_PATH.exists():
            return False

        try:
            cached_index = joblib.load(DOCUMENT_INDEX_PATH)
        except (OSError, ValueError, EOFError):
            return False

        required_keys = {
            "cache_format_version",
            "source_fingerprint",
            "model_name",
            "chunks",
            "embeddings",
            "tfidf_vectorizer",
            "tfidf_matrix",
        }
        if (
            not isinstance(cached_index, dict)
            or not required_keys.issubset(cached_index)
            or cached_index["cache_format_version"] != self.cache_format_version
            or cached_index["source_fingerprint"] != source_fingerprint
            or cached_index["model_name"] != self.model_name
        ):
            return False

        self._chunks = cached_index["chunks"]
        self._embeddings = cached_index["embeddings"]
        self._tfidf_vectorizer = cached_index["tfidf_vectorizer"]
        self._tfidf_matrix = cached_index["tfidf_matrix"]
        self._embedding_model = self._load_embedding_model()
        self._is_ready = True
        self._loaded_fingerprint = source_fingerprint
        return True

    def _save_index(self, source_fingerprint: str) -> None:
        DOCUMENT_INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(
            {
                "cache_format_version": self.cache_format_version,
                "source_fingerprint": source_fingerprint,
                "model_name": self.model_name,
                "chunks": self._chunks,
                "embeddings": self._embeddings,
                "tfidf_vectorizer": self._tfidf_vectorizer,
                "tfidf_matrix": self._tfidf_matrix,
            },
            DOCUMENT_INDEX_PATH,
        )

    def _build_index(self, source_fingerprint: str) -> None:
        self._chunks = self._load_chunks()

        search_texts = [
            (
                f"{chunk['title']}. "
                f"{chunk['purpose']}. "
                f"{chunk['text']}"
            )
            for chunk in self._chunks
        ]

        self._embedding_model = self._load_embedding_model()
        self._embeddings = self._embedding_model.encode(
            search_texts,
            normalize_embeddings=True,
            show_progress_bar=False,
        )

        self._tfidf_vectorizer = TfidfVectorizer(
            stop_words="english",
            ngram_range=(1, 2),
        )
        self._tfidf_matrix = self._tfidf_vectorizer.fit_transform(
            search_texts
        )

        self._is_ready = True
        self._loaded_fingerprint = source_fingerprint
        self._save_index(source_fingerprint)

    def _ensure_index(self) -> None:
        source_fingerprint = self._source_fingerprint()
        if self._is_ready and self._loaded_fingerprint == source_fingerprint:
            return

        self._is_ready = False
        if not self._load_cached_index(source_fingerprint):
            self._build_index(source_fingerprint)

    def search(
        self,
        query: str,
        top_k: int,
    ) -> list[DocumentSearchResult]:
        self._ensure_index()

        assert self._embedding_model is not None
        assert self._embeddings is not None
        assert self._tfidf_vectorizer is not None
        assert self._tfidf_matrix is not None

        search_query = self._expand_safety_query(query)
        query_embedding = self._embedding_model.encode(
            search_query,
            normalize_embeddings=True,
        )
        semantic_scores = self._embeddings @ query_embedding

        query_tfidf = self._tfidf_vectorizer.transform([search_query])
        keyword_scores = cosine_similarity(
            query_tfidf,
            self._tfidf_matrix,
        ).flatten()

        combined_scores = (
            0.5 * self._scale_to_zero_one(semantic_scores)
            + 0.5 * keyword_scores
        )

        top_indices = np.argsort(combined_scores)[::-1][:top_k]
        return [
            DocumentSearchResult(
                source_id=self._chunks[index]["source_id"],
                title=self._chunks[index]["title"],
                source_url=self._chunks[index]["source_url"],
                page_number=self._chunks[index]["page_number"],
                chunk_number=self._chunks[index]["chunk_number"],
                text=self._chunks[index]["text"],
                similarity_score=round(
                    float(combined_scores[index]),
                    4,
                ),
            )
            for index in top_indices
        ]


document_search_service = DocumentSearchService()
