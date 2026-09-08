"""Synthetic demo dataset for the sandboxed backend.

There is no live Kafka/Postgres in this environment (and no producers have
actually run against a real broker), so without this module `defect_task`
would be empty and the digital twin would have no train state at all.
`SEED_DEMO_DATA` (default true) is this project's `USE_MOCK_DATA`-equivalent:
it seeds a small, fixed-seed dataset built from the same pure producer
builders Phases 1-3 already test (`defect_producer.build_defect_message`,
`corridor_timetable_producer.build_corridor_availability`), so `/defects`,
`/blockplan/*`, and `/conflicts` have something real to score/plan/predict
over. A real deployment sets `SEED_DEMO_DATA=false`; the routes that read
live DB rows already fall back correctly when demo seeding is off and no
rows exist yet (see `routers/blockplan.py`), and `udm_writer.py` is what
populates `defect_task`/`corridor_block_slot` for real once producers run.
"""
from __future__ import annotations

import os
import random
from datetime import datetime, timedelta, timezone

from services.digital_twin.api import DigitalTwinApi, digital_twin_api
from services.ingestion.udm_writer import corridor_slot_row
from services.producers.corridor_timetable_producer import build_corridor_availability
from services.producers.defect_producer import build_defect_message
from services.producers.reference_data import ASSETS

SEED_DEMO_DATA = os.environ.get("SEED_DEMO_DATA", "true").strip().lower() != "false"

DEFAULT_SEED = 42
DEFAULT_DEFECT_COUNT = 24

# Section/trains the demo digital-twin state seeds a guaranteed convergence
# on, mirroring the same same-direction-closing-speed scenario
# `tests/test_traffic_optimizer.py::_converging_conflict` uses so
# `fast_tier.predict_conflicts` reliably finds something to report.
DEMO_CONFLICT_SECTION = "SEC-B"
DEMO_CONFLICT_TRAINS = (
    {"train_id": "TRN-101", "chainage_km": 64.0, "speed_kmph": 70.0, "direction": "UP"},
    {"train_id": "TRN-102", "chainage_km": 68.0, "speed_kmph": 65.0, "direction": "UP"},
)


def seed_demo_defects(
    seed: int = DEFAULT_SEED, count: int = DEFAULT_DEFECT_COUNT, now: datetime | None = None
) -> list[dict]:
    now = now or datetime.now(timezone.utc)
    rng = random.Random(seed)
    defects = []
    for _ in range(count):
        asset = rng.choice(ASSETS)
        _topic, message = build_defect_message(asset, rng, now=now)
        defects.append(message)
    return defects


def seed_demo_slots(
    seed: int = DEFAULT_SEED, weeks: int = 5, week_offset: int = 0, now: datetime | None = None
) -> list[dict]:
    # Naive on purpose: block_optimizer/solver.py's slot_is_available()
    # compares window_start/window_end against defect reported_date/due_date
    # (plain "YYYY-MM-DD" strings, always naive once parsed) via
    # datetime.fromisoformat -- mixing a tz-aware window with a naive defect
    # date raises TypeError, so slots must stay naive to match, exactly like
    # every window_start/window_end literal in tests/test_block_optimizer.py.
    #
    # `week_offset` is available for a caller that wants two horizons drawn
    # from disjoint week ranges of this same fixed-seed generator; the
    # weekly/monthly jobs don't need it (see services/scheduling/jobs.py's
    # `_persist_plans` for how they instead keep horizons' block_plan rows
    # independent even when the same slot appears in both).
    now = now or datetime.now(timezone.utc)
    base = now.replace(tzinfo=None, minute=0, second=0, microsecond=0)
    rng = random.Random(seed)
    slots: list[dict] = []
    for week in range(weeks + week_offset):
        week_base = base + timedelta(weeks=week)
        messages = build_corridor_availability(rng, week_base)
        if week >= week_offset:
            slots.extend(corridor_slot_row(message) for message in messages)
    return slots


def seed_demo_digital_twin_state(twin: DigitalTwinApi | None = None, now: datetime | None = None) -> None:
    twin = twin or digital_twin_api
    timestamp = (now or datetime.now(timezone.utc)).isoformat()
    for train in DEMO_CONFLICT_TRAINS:
        twin.ingest(
            "train.position.v1",
            {
                "train_id": train["train_id"],
                "section": DEMO_CONFLICT_SECTION,
                "chainage_km": train["chainage_km"],
                "speed_kmph": train["speed_kmph"],
                "direction": train["direction"],
                "timestamp": timestamp,
            },
        )
