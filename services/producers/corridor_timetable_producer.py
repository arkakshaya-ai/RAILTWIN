"""Publishes the fixed weekly corridor.availability / timetable / goods.forecast schedule once at startup.

Fixed seed (42) so the published schedule is identical across demo runs,
matching the other Section-3 producers.
"""
from __future__ import annotations

import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from services.producers.kafka_utils import build_producer, publish
from services.producers.reference_data import SECTION_NAMES, TRAIN_IDS

CORRIDOR_TOPIC = "corridor.availability.v1"
TIMETABLE_TOPIC = "timetable.v1"
GOODS_FORECAST_TOPIC = "goods.forecast.v1"

BLOCK_TYPES = ["line", "power", "traffic"]
PRIORITY_CLASSES = ["superfast", "express", "passenger", "freight"]
SCHEDULE_DAYS = 7


def build_corridor_availability(rng: random.Random, base: datetime) -> list[dict]:
    messages = []
    for section in SECTION_NAMES:
        for day_offset in range(SCHEDULE_DAYS):
            start = base + timedelta(days=day_offset, hours=rng.choice([1, 2, 3, 22, 23]))
            end = start + timedelta(hours=rng.uniform(1.5, 4.0))
            messages.append(
                {
                    "section": section,
                    "window_start": start.isoformat(),
                    "window_end": end.isoformat(),
                    "block_type": rng.choice(BLOCK_TYPES),
                }
            )
    return messages


def build_timetable(rng: random.Random, base: datetime) -> list[dict]:
    messages = []
    for train_id in TRAIN_IDS:
        section = rng.choice(SECTION_NAMES)
        arrival = base + timedelta(minutes=rng.randint(0, SCHEDULE_DAYS * 24 * 60))
        departure = arrival + timedelta(minutes=rng.randint(5, 45))
        messages.append(
            {
                "train_id": train_id,
                "section": section,
                "scheduled_arrival": arrival.isoformat(),
                "scheduled_departure": departure.isoformat(),
                "priority_class": rng.choice(PRIORITY_CLASSES),
            }
        )
    return messages


def build_goods_forecast(rng: random.Random, base: datetime) -> list[dict]:
    messages = []
    for section in SECTION_NAMES:
        for day_offset in range(SCHEDULE_DAYS):
            messages.append(
                {
                    "section": section,
                    "date": (base + timedelta(days=day_offset)).date().isoformat(),
                    "expected_goods_traffic_density": round(rng.uniform(0.1, 0.95), 3),
                }
            )
    return messages


def build_argparser():
    import argparse

    parser = argparse.ArgumentParser(description="Publish the fixed corridor/timetable/forecast schedule.")
    parser.add_argument("--seed", type=int, default=42)
    return parser


def main() -> None:
    args = build_argparser().parse_args()
    rng = random.Random(args.seed)
    base = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    producer = build_producer()

    for message in build_corridor_availability(rng, base):
        publish(producer, CORRIDOR_TOPIC, message, key=message["section"])
    for message in build_timetable(rng, base):
        publish(producer, TIMETABLE_TOPIC, message, key=message["train_id"])
    for message in build_goods_forecast(rng, base):
        publish(producer, GOODS_FORECAST_TOPIC, message, key=message["section"])

    producer.flush(10)


if __name__ == "__main__":
    main()
