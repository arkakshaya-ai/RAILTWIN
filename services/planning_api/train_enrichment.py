"""Stand-in enrichment for digital-twin train readings before they reach the
traffic optimizer.

`traffic_optimizer.solver`/`safety_validation` need a priority class (key
into `solver.DEFAULT_PRIORITY_WEIGHTS`) and `crew_duty_minutes` (checked
against `safety_validation.MAX_CREW_DUTY_MINUTES`) on every train dict.
Neither field exists on `train.position.v1`: `priority_class` is only
published on the separate `timetable.v1` feed
(`services/producers/corridor_timetable_producer.py`), and no crew-roster
feed exists at all yet. Until a real timetable-join / crew-roster service
exists, this module derives both fields deterministically from the
train_id's numeric suffix, so behavior is reproducible across calls and
across tests -- it is explicitly a documented stand-in, not a source of
truth, and is meant to be replaced wholesale (not extended) once a real
feed exists.
"""
from __future__ import annotations

import re

CATEGORY_CYCLE = ["express", "mail", "passenger", "freight"]

# Comfortably under safety_validation.MAX_CREW_DUTY_MINUTES (480 min) for any
# train that hasn't already been sitting through a long hold -- a synthetic
# baseline should not itself become a spurious HOER-gate rejection for an
# ordinary conflict resolution.
BASE_CREW_DUTY_MINUTES = 120.0
CREW_DUTY_JITTER_MINUTES = 90.0
JITTER_BUCKETS = 5


def _numeric_suffix(train_id: str) -> int:
    match = re.search(r"(\d+)$", train_id)
    return int(match.group(1)) if match else 0


def derive_priority_class(train_id: str) -> str:
    return CATEGORY_CYCLE[_numeric_suffix(train_id) % len(CATEGORY_CYCLE)]


def derive_crew_duty_minutes(train_id: str) -> float:
    bucket = _numeric_suffix(train_id) % JITTER_BUCKETS
    return BASE_CREW_DUTY_MINUTES + bucket * (CREW_DUTY_JITTER_MINUTES / JITTER_BUCKETS)


def enrich_train(train: dict) -> dict:
    """Returns a copy of `train` (digital-twin shaped) with `priority_class`
    and `crew_duty_minutes` filled in. Any value already present on `train`
    (e.g. once a real timetable-join feed exists) is left untouched.
    """
    enriched = dict(train)
    enriched.setdefault("priority_class", derive_priority_class(train["train_id"]))
    enriched.setdefault("crew_duty_minutes", derive_crew_duty_minutes(train["train_id"]))
    return enriched


def enrich_trains(trains: list[dict]) -> list[dict]:
    return [enrich_train(t) for t in trains]
