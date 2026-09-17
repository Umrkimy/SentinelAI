import argparse
from time import sleep

from simulator.mqtt_publisher import TelemetryPublisher
from simulator.telemetry import TelemetryGenerator


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Send synthetic machine telemetry through MQTT."
    )
    parser.add_argument("--equipment-id", type=int, required=True)
    parser.add_argument(
        "--mode",
        choices=["healthy", "deteriorating"],
        default="healthy",
    )
    parser.add_argument("--count", type=int, default=10)
    parser.add_argument("--starting-cycle", type=int, default=1)
    parser.add_argument("--interval", type=float, default=1)
    parser.add_argument("--mqtt-host", default="127.0.0.1")
    parser.add_argument("--mqtt-port", type=int, default=1883)
    return parser.parse_args()


def main() -> None:
    args = parse_arguments()

    generator = TelemetryGenerator(seed=42)
    publisher = TelemetryPublisher(
        host=args.mqtt_host,
        port=args.mqtt_port,
    )
    device_id = f"simulator-equipment-{args.equipment_id}"

    publisher.connect()

    try:
        for step in range(args.count):
            reading = generator.generate(
                mode=args.mode,
                step=step,
                operating_cycle=args.starting_cycle + step,
            )
            topic = publisher.publish(
                equipment_id=args.equipment_id,
                device_id=device_id,
                sequence_number=step + 1,
                sensor_values=reading.to_payload(),
            )

            print(
                f"Step {step + 1}: published {args.mode} telemetry "
                f"to {topic}"
            )

            if step < args.count - 1:
                sleep(args.interval)
    finally:
        publisher.disconnect()


if __name__ == "__main__":
    main()
