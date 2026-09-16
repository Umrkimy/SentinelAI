import json
from datetime import datetime, timezone

import paho.mqtt.client as mqtt


class TelemetryPublisher:
    def __init__(
        self,
        host: str = "127.0.0.1",
        port: int = 1883,
    ) -> None:
        self.host = host
        self.port = port
        self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)

    def connect(self) -> None:
        self.client.connect(self.host, self.port, keepalive=60)
        self.client.loop_start()

    def publish(
        self,
        equipment_id: int,
        device_id: str,
        sequence_number: int,
        sensor_values: dict[str, float],
    ) -> str:
        topic = f"sentinelai/telemetry/{equipment_id}"

        message = {
            "equipment_id": equipment_id,
            "device_id": device_id,
            "sequence_number": sequence_number,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            **sensor_values,
        }

        result = self.client.publish(topic, json.dumps(message), qos=1)
        result.wait_for_publish()

        return topic

    def disconnect(self) -> None:
        self.client.loop_stop()
        self.client.disconnect()