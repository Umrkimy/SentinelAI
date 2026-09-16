from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_predict_high_risk():
    response = client.post(
        "/predict",
        json={
            "air_temperature_k": 298.7,
            "process_temperature_k": 310.1,
            "rotational_speed_rpm": 1402,
            "torque_nm": 69.7,
            "tool_wear_min": 64,
        },
    )

    assert response.status_code == 200
    assert response.json()["risk"] == "HIGH"
    assert response.json()["failure_probability"] >= 0.5


def test_predict_rejects_missing_input():
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