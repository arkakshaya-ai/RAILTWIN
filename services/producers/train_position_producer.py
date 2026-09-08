"""Simulates trains moving along the corridor and publishes train.position.v1 every 5s."""
from __future__ import annotations

import argparse
import random
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from services.producers.kafka_utils import build_producer, publish
from services.producers.reference_data import SECTIONS, TRAIN_IDS, section_for_chainage

TOPIC = "train.position.v1"
DEFAULT_INTERVAL_SECONDS = 5.0
MIN_SPEED_KMPH = 60.0
MAX_SPEED_KMPH = 120.0
SPEED_JITTER_KMPH = 8.0

NETWORK_START_KM = SECTIONS[0].start_km
NETWORK_END_KM = SECTIONS[-1].end_km


@dataclass
class TrainState:
    train_id: str
    chainage_km: float
    direction: str
    speed_kmph: float


def seed_trains(train_ids: list[str], rng: random.Random) -> list[TrainState]:
    return [
        TrainState(
            train_id=train_id,
            chainage_km=rng.uniform(NETWORK_START_KM, NETWORK_END_KM),
            direction=rng.choice(["UP", "DOWN"]),
            speed_kmph=rng.uniform(MIN_SPEED_KMPH, MAX_SPEED_KMPH),
        )
        for train_id in train_ids
    ]


def advance_train(state: TrainState, elapsed_seconds: float, rng: random.Random) -> TrainState:
    jittered = state.speed_kmph + rng.uniform(-SPEED_JITTER_KMPH, SPEED_JITTER_KMPH)
    state.speed_kmph = min(MAX_SPEED_KMPH, max(MIN_SPEED_KMPH, jittered))
    delta_km = (state.speed_kmph / 3600.0) * elapsed_seconds

    if state.direction == "UP":
        state.chainage_km += delta_km
        if state.chainage_km >= NETWORK_END_KM:
            state.chainage_km = NETWORK_END_KM
            state.direction = "DOWN"
    else:
        state.chainage_km -= delta_km
        if state.chainage_km <= NETWORK_START_KM:
            state.chainage_km = NETWORK_START_KM
            state.direction = "UP"
    return state


def to_message(state: TrainState, now: datetime | None = None) -> dict:
    now = now or datetime.now(timezone.utc)
    return {
        "train_id": state.train_id,
        "timestamp": now.isoformat(),
        "section": section_for_chainage(state.chainage_km),
        "chainage_km": round(state.chainage_km, 3),
        "speed_kmph": round(state.speed_kmph, 2),
        "direction": state.direction,
    }


def build_argparser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Simulate train position telemetry.")
    parser.add_argument("--num-trains", type=int, default=10, help="8-12 trains is the realistic dev fleet size.")
    parser.add_argument("--interval-seconds", type=float, default=DEFAULT_INTERVAL_SECONDS)
    return parser


def main() -> None:
    args = build_argparser().parse_args()
    rng = random.Random()
    train_ids = TRAIN_IDS[: args.num_trains] if args.num_trains <= len(TRAIN_IDS) else [
        f"TRN-{i:03d}" for i in range(1, args.num_trains + 1)
    ]
    states = seed_trains(train_ids, rng)
    producer = build_producer()
    try:
        while True:
            for state in states:
                advance_train(state, args.interval_seconds, rng)
                publish(producer, TOPIC, to_message(state), key=state.train_id)
            producer.flush(1)
            time.sleep(args.interval_seconds)
    except KeyboardInterrupt:
        pass
    finally:
        producer.flush(5)


if __name__ == "__main__":
    main()
