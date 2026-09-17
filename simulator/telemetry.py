from dataclasses import asdict, dataclass
from random import Random
from typing import Literal


TelemetryMode = Literal["healthy", "deteriorating"]


@dataclass
class TelemetryReading:
    air_temperature_k: float
    process_temperature_k: float
    rotational_speed_rpm: float
    torque_nm: float
    tool_wear_min: float
    operating_cycle: int

    def to_payload(self) -> dict[str, float | int]:
        return asdict(self)


class TelemetryGenerator:
    def __init__(self, seed: int | None = None) -> None:
        self.random = Random(seed)

    def generate(
        self,
        mode: TelemetryMode,
        step: int,
        operating_cycle: int | None = None,
    ) -> TelemetryReading:
        cycle = operating_cycle if operating_cycle is not None else step + 1
        if mode == "healthy":
            return TelemetryReading(
                air_temperature_k=round(298 + self.random.uniform(-0.8, 0.8), 2),
                process_temperature_k=round(308 + self.random.uniform(-0.8, 0.8), 2),
                rotational_speed_rpm=round(1500 + self.random.uniform(-100, 100), 2),
                torque_nm=round(42 + self.random.uniform(-5, 5), 2),
                tool_wear_min=round(50 + step * 0.5, 2),
                operating_cycle=cycle,
            )

        deterioration = min(step, 30)

        return TelemetryReading(
            air_temperature_k=round(300 + self.random.uniform(-0.8, 0.8), 2),
            process_temperature_k=round(310 + self.random.uniform(-0.8, 0.8), 2),
            rotational_speed_rpm=round(
                1450 - deterioration * 5 + self.random.uniform(-50, 50),
                2,
            ),
            torque_nm=round(
                55 + deterioration * 0.6 + self.random.uniform(-3, 3),
                2,
            ),
            tool_wear_min=round(160 + deterioration * 2, 2),
            operating_cycle=cycle,
        )
