from fastapi.testclient import TestClient


def create_equipment(client: TestClient) -> dict:
    response = client.post(
        "/equipment",
        json={
            "asset_tag": "CNC-TEST-001",
            "machine_type": "CNC Milling Machine",
            "location": "Test Workshop",
        },
    )
    assert response.status_code == 201
    return response.json()


def test_create_and_list_equipment(client: TestClient) -> None:
    equipment = create_equipment(client)

    response = client.get("/equipment")

    assert response.status_code == 200
    assert response.json() == [equipment]


def test_duplicate_equipment_is_rejected(client: TestClient) -> None:
    create_equipment(client)

    response = client.post(
        "/equipment",
        json={
            "asset_tag": "CNC-TEST-001",
            "machine_type": "CNC Milling Machine",
            "location": "Test Workshop",
        },
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "Equipment asset_tag already exists."


def test_stored_prediction_appears_in_equipment_history(client: TestClient) -> None:
    equipment = create_equipment(client)

    prediction_response = client.post(
        f"/equipment/{equipment['id']}/predict",
        json={
            "air_temperature_k": 300.0,
            "process_temperature_k": 310.0,
            "rotational_speed_rpm": 1400.0,
            "torque_nm": 65.0,
            "tool_wear_min": 220.0,
            "operating_cycle": 400,
        },
    )

    assert prediction_response.status_code == 201
    prediction = prediction_response.json()
    assert prediction["equipment_id"] == equipment["id"]
    assert prediction["risk"] == "HIGH"
    assert isinstance(prediction["anomaly_score"], float)
    assert isinstance(prediction["is_anomaly"], bool)
    assert prediction["anomaly_model_name"] == "Isolation Forest healthy-baseline v1"
    assert isinstance(prediction["predicted_rul_cycles"], float)
    assert isinstance(prediction["conservative_rul_cycles"], float)

    history_response = client.get(f"/equipment/{equipment['id']}/predictions")

    assert history_response.status_code == 200
    history = history_response.json()
    assert len(history) == 1
    assert history[0]["prediction_id"] == prediction["prediction_id"]
    assert history[0]["sensor_reading_id"] == prediction["sensor_reading_id"]
    assert history[0]["torque_nm"] == 65.0
    assert history[0]["anomaly_score"] == prediction["anomaly_score"]
    assert history[0]["is_anomaly"] == prediction["is_anomaly"]
    assert history[0]["operating_cycle"] == 400
    assert history[0]["predicted_rul_cycles"] == prediction["predicted_rul_cycles"]


def test_prediction_for_unknown_equipment_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/equipment/999/predict",
        json={
            "air_temperature_k": 300.0,
            "process_temperature_k": 310.0,
            "rotational_speed_rpm": 1400.0,
            "torque_nm": 65.0,
            "tool_wear_min": 220.0,
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Equipment not found."
