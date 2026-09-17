from fastapi.testclient import TestClient

from backend.app.main import app


client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_predict_high_risk() -> None:
    response = client.post(
        "/predict",
        json={
            "air_temperature_k": 298.7,
            "process_temperature_k": 310.1,
            "rotational_speed_rpm": 1402,
            "torque_nm": 69.7,
            "tool_wear_min": 64,
            "operating_cycle": 400,
        },
    )

    assert response.status_code == 200
    assert response.json()["risk"] == "HIGH"
    assert response.json()["failure_probability"] >= 0.5
    assert isinstance(response.json()["anomaly_score"], float)
    assert isinstance(response.json()["is_anomaly"], bool)
    assert (
        response.json()["anomaly_model_name"]
        == "Isolation Forest healthy-baseline v1"
    )
    assert isinstance(response.json()["predicted_rul_cycles"], float)
    assert isinstance(response.json()["conservative_rul_cycles"], float)
    assert response.json()["rul_model_name"] == "Random Forest synthetic-RUL v1"


def test_predict_rejects_missing_input() -> None:
    response = client.post(
        "/predict",
        json={
            "air_temperature_k": 298.7,
            "process_temperature_k": 310.1,
            "rotational_speed_rpm": 1402,
            "tool_wear_min": 64,
        },
    )

    assert response.status_code == 422
