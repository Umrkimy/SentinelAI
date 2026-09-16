from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]
MODEL_PATH = PROJECT_ROOT / "models" / "xgboost_failure_model.joblib"
