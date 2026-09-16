import json
import os
from typing import Any

import httpx
import paho.mqtt.client as mqtt


SENSOR_FIELDS = (
    "air_temperature_k",
    "process_temperature_k",
    "rotational_speed_rpm",
    "torque_nm",
    "tool_wear_min",
)

REQUIRED_FIELDS = (
    "equipment_id",
    "device_id",
    "sequence_number",
    "timestamp",
    *SENSOR_FIELDS,
)


class TelemetryGateway:
    def __init__(self) -> None:
        self.mqtt_host = os.getenv("MQTT_HOST", "127.0.0.1")
        self.mqtt_port = int(os.getenv("MQTT_PORT", "1883"))
        self.backend_url = os.getenv(
            "BACKEND_URL",
            "http://127.0.0.1:8000",
        ).rstrip("/")

        self.mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        self.mqtt_client.on_connect = self.on_connect
        self.mqtt_client.on_message = self.on_message

        self.http_client = httpx.Client(timeout=10)

    def on_connect(
        self,
        client: mqtt.Client,
        userdata: Any,
        flags: dict[str, Any],
        reason_code: Any,
        properties: Any,
    ) -> None:
        print(f"Connected to MQTT broker: {reason_code}")
        client.subscribe("sentinelai/telemetry/#", qos=1)
        print("Subscribed to: sentinelai/telemetry/#")

    def on_message(
        self,
        client: mqtt.Client,
        userdata: Any,
        mqtt_message: mqtt.MQTTMessage,
    ) -> None:
        try:
            payload = json.loads(mqtt_message.payload.decode("utf-8"))
            equipment_id, sensor_values = self.validate_message(payload)

            response = self.http_client.post(
                f"{self.backend_url}/equipment/{equipment_id}/predict",
                json=sensor_values,
            )
            response.raise_for_status()

            prediction = response.json()
            print(
                f"Forwarded telemetry for equipment {equipment_id} "
                f"→ risk: {prediction['risk']} "
                f"({prediction['failure_probability']:.2%})"
            )

        except (
            ValueError,
            KeyError,
            json.JSONDecodeError,
            httpx.HTTPError,
        ) as error:
            print(f"Gateway rejected or failed to forward message: {error}")

    @staticmethod
    def validate_message(
        payload: dict[str, Any],
    ) -> tuple[int, dict[str, float]]:
        missing_fields = [
            field for field in REQUIRED_FIELDS if field not in payload
        ]

        if missing_fields:
            raise ValueError(f"Missing fields: {', '.join(missing_fields)}")

        equipment_id = int(payload["equipment_id"])
        sensor_values = {
            field: float(payload[field])
            for field in SENSOR_FIELDS
        }

        return equipment_id, sensor_values

    def run(self) -> None:
        self.mqtt_client.connect(
            self.mqtt_host,
            self.mqtt_port,
            keepalive=60,
        )

        try:
            self.mqtt_client.loop_forever()
        finally:
            self.http_client.close()


if __name__ == "__main__":
    TelemetryGateway().run()