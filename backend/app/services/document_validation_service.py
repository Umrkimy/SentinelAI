from pathlib import Path

import pymupdf


MAX_DOCUMENT_BYTES = 10 * 1024 * 1024
MAX_DOCUMENT_PAGES = 300
MAX_DOCUMENT_TEXT_CHARACTERS = 2_000_000
PDF_SIGNATURE = b"%PDF-"


class DocumentValidationError(ValueError):
    """Raised when a local reference document is unsafe or unsuitable to index."""


def validate_pdf_file(pdf_path: Path) -> None:
    """Validate inexpensive file properties before parsing untrusted PDF content."""
    if pdf_path.suffix.lower() != ".pdf":
        raise DocumentValidationError("Only PDF reference documents are allowed.")

    try:
        file_size = pdf_path.stat().st_size
        with pdf_path.open("rb") as pdf_file:
            signature = pdf_file.read(len(PDF_SIGNATURE))
    except OSError as error:
        raise DocumentValidationError(
            f"Reference document cannot be read: {pdf_path.name}"
        ) from error

    if file_size == 0 or file_size > MAX_DOCUMENT_BYTES:
        raise DocumentValidationError(
            f"Reference document must be between 1 byte and {MAX_DOCUMENT_BYTES // 1024 // 1024} MB."
        )
    if signature != PDF_SIGNATURE:
        raise DocumentValidationError(
            "Reference document does not have a valid PDF signature."
        )


def validate_open_pdf(pdf: pymupdf.Document) -> None:
    """Validate parser-level limits before text is added to the retrieval index."""
    if pdf.needs_pass:
        raise DocumentValidationError(
            "Password-protected PDFs cannot be indexed."
        )
    if len(pdf) == 0 or len(pdf) > MAX_DOCUMENT_PAGES:
        raise DocumentValidationError(
            f"Reference document must contain 1 to {MAX_DOCUMENT_PAGES} pages."
        )


def validate_pdf_for_indexing(pdf_path: Path) -> None:
    """Validate a PDF and enforce an extractable-text limit before storage."""
    validate_pdf_file(pdf_path)

    try:
        with pymupdf.open(pdf_path) as pdf:
            validate_open_pdf(pdf)
            extracted_characters = sum(
                len(page.get_text()) for page in pdf
            )
    except pymupdf.FileDataError as error:
        raise DocumentValidationError("PDF content could not be parsed.") from error

    if extracted_characters > MAX_DOCUMENT_TEXT_CHARACTERS:
        raise DocumentValidationError(
            "Reference document contains too much extractable text."
        )
