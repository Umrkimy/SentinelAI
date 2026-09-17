import pytest

from gateway.main import TelemetryGateway


def valid_payload() -> dict[str, object]:
    return {
        "equipment_id": 1,
        "device_id": "simulator-equipment-1",
        "sequence_number": 1,
        "timestamp": "2026-09-16T15:30:00+00:00",
        "air_temperature_k": 298.0,
        "process_temperature_k": 308.0,
        "rotational_speed_rpm": 1500.0,
        "torque_nm": 42.0,
        "tool_wear_min": 50.0,
        "operating_cycle": 400,
    }


def test_validate_message_returns_equipment_and_sensor_values() -> None:
    equipment_id, sensor_values = TelemetryGateway.validate_message(
        valid_payload()
    )

    assert equipment_id == 1
    assert sensor_values["torque_nm"] == 42.0
    assert sensor_values["operating_cycle"] == 400
    assert len(sensor_values) == 6


def test_validate_message_rejects_missing_sensor_value() -> None:
    payload = valid_payload()
    del payload["torque_nm"]

    with pytest.raises(ValueError, match="Missing fields: torque_nm"):
        TelemetryGateway.validate_message(payload)
