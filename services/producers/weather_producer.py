"""Periodic per-section weather events; worse conditions carry lower speed restrictions.

Fixed seed (default 42) for reproducible demos, matching the other producers.
"""
from __future__ import annotations

import argparse
import random
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from services.producers.kafka_utils import build_producer, publish
from services.producers.reference_data import SECTION_NAMES

TOPIC = "weather.v1"
DEFAULT_INTERVAL_SECONDS = 300.0

CONDITION_PROFILE = {
    "clear": {"severity_range": (0, 1), "speed_restriction_kmph": 120.0},
    "heat": {"severity_range": (1, 3), "speed_restriction_kmph": 100.0},
    "fog": {"severity_range": (2, 4), "speed_restriction_kmph": 60.0},
    "monsoon": {"severity_range": (2, 5), "speed_restriction_kmph": 45.0},
}
CONDITION_WEIGHTS = {"clear": 0.55, "heat": 0.2, "fog": 0.15, "monsoon": 0.1}


def build_weather_message(section: str, rng: random.Random, now: datetime | None = None) -> dict:
    now = now or datetime.now(timezone.utc)
    condition = rng.choices(
        list(CONDITION_WEIGHTS.keys()), weights=list(CONDITION_WEIGHTS.values()), k=1
    )[0]
    profile = CONDITION_PROFILE[condition]
    severity = rng.randint(*profile["severity_range"])
    jitter = rng.uniform(-5, 5) if condition != "clear" else 0.0
    return {
        "section": section,
        "condition": condition,
        "severity": severity,
        "speed_restriction_kmph": max(20.0, round(profile["speed_restriction_kmph"] + jitter, 1)),
        "timestamp": now.isoformat(),
    }


def build_argparser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Simulate per-section weather conditions.")
    parser.add_argument("--interval-seconds", type=float, default=DEFAULT_INTERVAL_SECONDS)
    parser.add_argument("--seed", type=int, default=42)
    return parser


def main() -> None:
    args = build_argparser().parse_args()
    rng = random.Random(args.seed)
    producer = build_producer()
    try:
        while True:
            for section in SECTION_NAMES:
                publish(producer, TOPIC, build_weather_message(section, rng), key=section)
            producer.flush(1)
            time.sleep(args.interval_seconds)
    except KeyboardInterrupt:
        pass
    finally:
        producer.flush(5)


if __name__ == "__main__":
    main()
