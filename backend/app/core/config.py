import os

from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]
MODEL_PATH = PROJECT_ROOT / "models" / "xgboost_failure_model.joblib"
ANOMALY_MODEL_PATH = (
    PROJECT_ROOT / "models" / "isolation_forest_anomaly_model.joblib"
)
RUL_MODEL_PATH = PROJECT_ROOT / "models" / "rul_model.joblib"
DOCUMENTS_DIR = PROJECT_ROOT / "data" / "documents"
DOCUMENT_SOURCES_PATH = DOCUMENTS_DIR / "sources.json"
DOCUMENT_INDEX_PATH = DOCUMENTS_DIR / "processed" / "document_index.joblib"
DOCUMENT_UPLOADS_DIR = DOCUMENTS_DIR / "uploads"

ADMIN_USERNAME = os.getenv("SENTINELAI_ADMIN_USERNAME", "")
ADMIN_PASSWORD_HASH = os.getenv("SENTINELAI_ADMIN_PASSWORD_HASH", "")
JWT_SECRET = os.getenv("SENTINELAI_JWT_SECRET", "")
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = 30
