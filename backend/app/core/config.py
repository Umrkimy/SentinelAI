from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]
MODEL_PATH = PROJECT_ROOT / "models" / "xgboost_failure_model.joblib"
ANOMALY_MODEL_PATH = (
    PROJECT_ROOT / "models" / "isolation_forest_anomaly_model.joblib"
)
