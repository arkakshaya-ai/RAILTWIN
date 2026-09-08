"""Task 4.1: builds a base (unperturbed) timetable from timetable.v1-shaped entries.

The synthetic producer (`corridor_timetable_producer.build_timetable`) emits
one row per train per week; a train may appear multiple times if a real feed
later includes multi-leg schedules, so this groups by train_id and orders
each train's own legs by scheduled_arrival rather than assuming exactly one
row per train.
"""
from __future__ import annotations

import random
from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass(frozen=True)
class TimetableLeg:
    section: str
    scheduled_arrival: str
    scheduled_departure: str
    priority_class: str | None = None


def _parse(ts: str) -> datetime:
    return datetime.fromisoformat(ts)


def build_base_timetable(entries: list[dict]) -> dict[str, list[TimetableLeg]]:
    by_train: dict[str, list[dict]] = {}
    for entry in entries:
        by_train.setdefault(entry["train_id"], []).append(entry)

    timetable: dict[str, list[TimetableLeg]] = {}
    for train_id, legs in by_train.items():
        ordered = sorted(legs, key=lambda e: _parse(e["scheduled_arrival"]))
        timetable[train_id] = [
            TimetableLeg(
                section=leg["section"],
                scheduled_arrival=leg["scheduled_arrival"],
                scheduled_departure=leg["scheduled_departure"],
                priority_class=leg.get("priority_class"),
            )
            for leg in ordered
        ]
    return timetable


def seed_base_timetable(seed: int = 42, now: datetime | None = None) -> dict[str, list[TimetableLeg]]:
    """Demo/test convenience: builds a base timetable from the same fixed-seed
    synthetic schedule `corridor_timetable_producer` would publish to
    `timetable.v1`, without needing a running Kafka broker.
    """
    from services.producers.corridor_timetable_producer import build_timetable

    rng = random.Random(seed)
    base = (now or datetime.now(timezone.utc)).replace(minute=0, second=0, microsecond=0)
    entries = build_timetable(rng, base)
    return build_base_timetable(entries)
