from simulator.telemetry import TelemetryGenerator


def test_healthy_tool_wear_increases_gradually() -> None:
    generator = TelemetryGenerator(seed=42)

    first = generator.generate(mode="healthy", step=0)
    later = generator.generate(mode="healthy", step=10)

    assert first.tool_wear_min == 50
    assert later.tool_wear_min == 55
    assert first.operating_cycle == 1
    assert later.operating_cycle == 11
    assert 37 <= first.torque_nm <= 47


def test_deteriorating_readings_show_expected_trend() -> None:
    generator = TelemetryGenerator(seed=42)

    early = generator.generate(mode="deteriorating", step=0)
    later = generator.generate(mode="deteriorating", step=30)

    assert later.tool_wear_min > early.tool_wear_min
    assert later.torque_nm > early.torque_nm
    assert later.rotational_speed_rpm < early.rotational_speed_rpm


def test_deterioration_is_capped_after_step_30() -> None:
    generator = TelemetryGenerator(seed=42)

    at_cap = generator.generate(mode="deteriorating", step=30)
    after_cap = generator.generate(mode="deteriorating", step=100)

    assert at_cap.tool_wear_min == 220
    assert after_cap.tool_wear_min == 220
