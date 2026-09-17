import numpy as np
from fastapi.testclient import TestClient
import pymupdf

import backend.app.services.auth_service as auth_service
import backend.app.services.document_upload_service as upload_service
from backend.app.schemas.document_search import DocumentSearchResult
from backend.app.services.document_search_service import (
    DocumentSearchService,
    document_search_service,
)


def configure_test_admin(monkeypatch) -> None:
    monkeypatch.setattr(auth_service, "ADMIN_USERNAME", "admin")
    monkeypatch.setattr(
        auth_service,
        "ADMIN_PASSWORD_HASH",
        auth_service.password_hash.hash("test-password"),
    )
    monkeypatch.setattr(
        auth_service,
        "JWT_SECRET",
        "test-secret-for-local-suite-only-1234567890",
    )


def admin_headers(client: TestClient, monkeypatch) -> dict[str, str]:
    configure_test_admin(monkeypatch)
    response = client.post(
        "/auth/token",
        data={"username": "admin", "password": "test-password"},
    )
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def make_pdf(path) -> None:
    with pymupdf.open() as pdf:
        page = pdf.new_page()
        page.insert_text((72, 72), "Lockout before maintenance work.")
        pdf.save(path)
from backend.app.services.document_validation_service import (
    DocumentValidationError,
    validate_pdf_file,
)


def test_document_search_returns_citations(
    client: TestClient,
    monkeypatch,
) -> None:
    def fake_search(
        query: str,
        top_k: int,
    ) -> list[DocumentSearchResult]:
        assert query == "How should equipment be maintained?"
        assert top_k == 3

        return [
            DocumentSearchResult(
                source_id="nasa-rcm-guide",
                title="NASA Reliability-Centered Maintenance Guide",
                source_url="https://example.com/nasa-guide.pdf",
                page_number=5,
                chunk_number=2,
                text="Condition monitoring supports maintenance planning.",
                similarity_score=0.91,
            )
        ]

    monkeypatch.setattr(
        document_search_service,
        "search",
        fake_search,
    )

    response = client.post(
        "/documents/search",
        json={
            "query": "How should equipment be maintained?",
            "top_k": 3,
        },
    )

    assert response.status_code == 200

    result = response.json()["results"][0]
    assert result["source_id"] == "nasa-rcm-guide"
    assert result["page_number"] == 5
    assert result["similarity_score"] == 0.91


def test_document_search_rejects_short_query(
    client: TestClient,
) -> None:
    response = client.post(
        "/documents/search",
        json={"query": "hi"},
    )

    assert response.status_code == 422


def test_document_index_cache_is_reused_when_sources_match(
    monkeypatch,
    tmp_path,
) -> None:
    index_path = tmp_path / "document_index.joblib"
    monkeypatch.setattr(
        "backend.app.services.document_search_service.DOCUMENT_INDEX_PATH",
        index_path,
    )

    service = DocumentSearchService()
    service._chunks = [{"source_id": "test", "text": "Maintenance plan"}]
    service._embeddings = np.array([[1.0, 0.0]])

    from sklearn.feature_extraction.text import TfidfVectorizer

    service._tfidf_vectorizer = TfidfVectorizer().fit(["Maintenance plan"])
    service._tfidf_matrix = service._tfidf_vectorizer.transform(
        ["Maintenance plan"]
    )
    service._save_index("matching-fingerprint")

    restored = DocumentSearchService()
    monkeypatch.setattr(restored, "_load_embedding_model", lambda: object())

    assert restored._load_cached_index("matching-fingerprint") is True
    assert restored._is_ready is True
    assert restored._chunks == service._chunks
    assert restored._load_cached_index("different-fingerprint") is False


def test_document_validation_rejects_a_non_pdf_with_pdf_extension(
    tmp_path,
) -> None:
    fake_pdf = tmp_path / "not-a-pdf.pdf"
    fake_pdf.write_text("This is not a PDF.", encoding="utf-8")

    try:
        validate_pdf_file(fake_pdf)
    except DocumentValidationError as error:
        assert "valid PDF signature" in str(error)
    else:
        raise AssertionError("A non-PDF file should be rejected.")


def test_document_upload_requires_an_admin_token(client: TestClient) -> None:
    response = client.post(
        "/documents/admin/upload",
        data={
            "source_id": "private-guide",
            "title": "Private Guide",
            "purpose": "Testing private uploads.",
        },
        files={"file": ("guide.pdf", b"%PDF-test", "application/pdf")},
    )

    assert response.status_code == 401


def test_document_admin_cors_allows_bearer_token_header(
    client: TestClient,
) -> None:
    response = client.options(
        "/documents/admin",
        headers={
            "Origin": "http://localhost:3500",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )

    assert response.status_code == 200
    assert "Authorization" in response.headers["access-control-allow-headers"]


def test_admin_can_upload_list_and_deduplicate_documents(
    client: TestClient,
    monkeypatch,
    tmp_path,
) -> None:
    upload_directory = tmp_path / "uploads"
    monkeypatch.setattr(upload_service, "DOCUMENT_UPLOADS_DIR", upload_directory)
    pdf_path = tmp_path / "guide.pdf"
    make_pdf(pdf_path)
    upload_bytes = pdf_path.read_bytes()
    headers = admin_headers(client, monkeypatch)
    payload = {
        "source_id": "private-maintenance-guide",
        "title": "Private Maintenance Guide",
        "publisher": "SentinelAI Test",
        "purpose": "Maintenance planning reference.",
    }

    uploaded = client.post(
        "/documents/admin/upload",
        data=payload,
        files={"file": ("guide.pdf", upload_bytes, "application/pdf")},
        headers=headers,
    )

    assert uploaded.status_code == 201
    assert uploaded.json()["status"] == "ready"
    assert len(list(upload_directory.glob("*.pdf"))) == 1

    listed = client.get("/documents/admin", headers=headers)
    assert listed.status_code == 200
    assert listed.json()[0]["source_id"] == payload["source_id"]

    duplicate = client.post(
        "/documents/admin/upload",
        data=payload,
        files={"file": ("guide.pdf", upload_bytes, "application/pdf")},
        headers=headers,
    )
    assert duplicate.status_code == 400
