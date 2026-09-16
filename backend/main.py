from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel

PROJECT_ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = PROJECT_ROOT / "models" / "xgboost_failure_model.joblib"

model_bundle = joblib.load(MODEL_PATH)


class SensorReading(BaseModel):
    air_temperature_k: float
    process_temperature_k: float
    rotational_speed_rpm: float
    torque_nm: float
    tool_wear_min: float


app = FastAPI(title="SentinelAI API")


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/model-info")
def model_info():
    return {
        "model_name": model_bundle["model_name"],
        "feature_names": model_bundle["feature_names"],
        "threshold": model_bundle["threshold"],
    }


@app.post("/predict")
def predict(reading: SensorReading):
    features = pd.DataFrame(
        [reading.model_dump()],
        columns=model_bundle["feature_names"],
    )

    failure_probability = float(
        model_bundle["model"].predict_proba(features)[0, 1]
    )

    risk = (
        "HIGH"
        if failure_probability >= model_bundle["threshold"]
        else "LOW"
    )

    return {
        "failure_probability": round(failure_probability, 4),
        "risk": risk,
        "threshold": model_bundle["threshold"],
    }