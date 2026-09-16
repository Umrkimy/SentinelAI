import argparse
import time

import httpx

from simulator.telemetry import TelemetryGenerator


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Send synthetic telemetry to SentinelAI."
    )
    parser.add_argument("--equipment-id", type=int, required=True)
    parser.add_argument(
        "--mode",
        choices=["healthy", "deteriorating"],
        default="healthy",
    )
    parser.add_argument("--count", type=int, default=10)
    parser.add_argument("--interval", type=float, default=1.0)
    parser.add_argument(
        "--api-url",
        default="http://127.0.0.1:8000",
    )
    args = parser.parse_args()

    generator = TelemetryGenerator(seed=42)

    with httpx.Client(timeout=10.0) as client:
        for step in range(args.count):
            reading = generator.generate(mode=args.mode, step=step)

            response = client.post(
                f"{args.api_url}/equipment/{args.equipment_id}/predict",
                json=reading.to_payload(),
            )
            response.raise_for_status()

            prediction = response.json()
            print(
                f"step={step + 1}/{args.count} "
                f"risk={prediction['risk']} "
                f"probability={prediction['failure_probability']:.2%}"
            )

            if step < args.count - 1:
                time.sleep(args.interval)


if __name__ == "__main__":
    main()