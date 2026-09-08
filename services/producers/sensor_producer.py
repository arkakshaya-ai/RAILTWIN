"""Axle occupancy + hot-box temperature sensor telemetry."""
from __future__ import annotations

import argparse
import random
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from services.producers.kafka_utils import build_producer, publish
from services.producers.reference_data import AXLE_SENSORS, HOTBOX_SENSORS

AXLE_TOPIC = "sensor.axle.v1"
HOTBOX_TOPIC = "sensor.hotbox.v1"
DEFAULT_INTERVAL_SECONDS = 5.0

NORMAL_TEMP_RANGE_C = (35.0, 55.0)
BREACH_TEMP_RANGE_C = (95.0, 140.0)


def build_axle_message(sensor: dict, rng: random.Random, now: datetime | None = None) -> dict:
    now = now or datetime.now(timezone.utc)
    return {
        "sensor_id": sensor["sensor_id"],
        "chainage_km": sensor["chainage_km"],
        "occupancy_state": rng.choice(["OCCUPIED", "CLEAR"]),
        "timestamp": now.isoformat(),
    }


def build_hotbox_message(
    sensor: dict, fault_rate: float, rng: random.Random, now: datetime | None = None
) -> dict:
    now = now or datetime.now(timezone.utc)
    breach = rng.random() < fault_rate
    temperature = rng.uniform(*BREACH_TEMP_RANGE_C) if breach else rng.uniform(*NORMAL_TEMP_RANGE_C)
    return {
        "sensor_id": sensor["sensor_id"],
        "chainage_km": sensor["chainage_km"],
        "temperature_c": round(temperature, 2),
        "threshold_breach": breach,
        "timestamp": now.isoformat(),
    }


def build_argparser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Simulate axle + hot-box sensor telemetry.")
    parser.add_argument(
        "--fault-rate",
        type=float,
        default=0.05,
        help="Fraction of hot-box readings with threshold_breach=true. 0.05 keeps breaches rare "
        "but still frequent enough to exercise defect/DLQ demo paths within a short run.",
    )
    parser.add_argument("--interval-seconds", type=float, default=DEFAULT_INTERVAL_SECONDS)
    return parser


def main() -> None:
    args = build_argparser().parse_args()
    rng = random.Random()
    producer = build_producer()
    try:
        while True:
            for sensor in AXLE_SENSORS:
                publish(producer, AXLE_TOPIC, build_axle_message(sensor, rng), key=sensor["sensor_id"])
            for sensor in HOTBOX_SENSORS:
                publish(
                    producer,
                    HOTBOX_TOPIC,
                    build_hotbox_message(sensor, args.fault_rate, rng),
                    key=sensor["sensor_id"],
                )
            producer.flush(1)
            time.sleep(args.interval_seconds)
    except KeyboardInterrupt:
        pass
    finally:
        producer.flush(5)


if __name__ == "__main__":
    main()
