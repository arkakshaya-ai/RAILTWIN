"""Fast-tier conflict lookahead (30-120 min) over the digital twin's fused state.

No live schedule feed exists yet, so "projection" here means straight-line
kinematics: hold each train's last-seen speed and direction constant and ask
whether two trains in the same block section would occupy the same chainage
inside the lookahead window. That is deliberately conservative (real trains
brake, reroute, hold at signals) — it is a fast tier meant to catch obvious
convergences cheaply and hand borderline cases to a slower, model-based tier
later; false positives here are far cheaper than missed conflicts.
"""
from __future__ import annotations

import itertools
from datetime import datetime, timedelta, timezone

DEFAULT_LOOKAHEAD_MINUTES = 120.0
MIN_LOOKAHEAD_MINUTES = 30.0

SEVERITY_THRESHOLDS_MINUTES = (
    (15.0, "critical"),
    (45.0, "high"),
    (90.0, "medium"),
)


def _severity_for_eta(minutes_ahead: float) -> str:
    for threshold, label in SEVERITY_THRESHOLDS_MINUTES:
        if minutes_ahead <= threshold:
            return label
    return "low"


def _time_to_convergence_minutes(train_a: dict, train_b: dict) -> float | None:
    pos_a, pos_b = train_a["chainage_km"], train_b["chainage_km"]
    speed_a, speed_b = train_a["speed_kmph"], train_b["speed_kmph"]
    dir_a, dir_b = train_a["direction"], train_b["direction"]

    if pos_a == pos_b:
        return 0.0

    if dir_a != dir_b:
        lower, upper = (train_a, train_b) if pos_a < pos_b else (train_b, train_a)
        if lower["direction"] != "UP" or upper["direction"] != "DOWN":
            return None
        closing_speed = lower["speed_kmph"] + upper["speed_kmph"]
        if closing_speed <= 0:
            return None
        distance_km = upper["chainage_km"] - lower["chainage_km"]
        return (distance_km / closing_speed) * 60.0

    velocity_a = speed_a if dir_a == "UP" else -speed_a
    velocity_b = speed_b if dir_b == "UP" else -speed_b
    closing_speed = velocity_a - velocity_b if pos_a < pos_b else velocity_b - velocity_a
    if closing_speed <= 0:
        return None
    distance_km = abs(pos_b - pos_a)
    return (distance_km / closing_speed) * 60.0


def predict_conflicts(
    network_state: dict[str, dict],
    lookahead_minutes: float = DEFAULT_LOOKAHEAD_MINUTES,
    now: datetime | None = None,
) -> list[dict]:
    now = now or datetime.now(timezone.utc)
    conflicts: list[dict] = []

    for section, section_state in network_state.items():
        trains = section_state.get("trains", [])
        for train_a, train_b in itertools.combinations(trains, 2):
            eta_minutes = _time_to_convergence_minutes(train_a, train_b)
            if eta_minutes is None or eta_minutes > lookahead_minutes:
                continue
            eta_dt = now + timedelta(minutes=eta_minutes)
            conflicts.append(
                {
                    "id": f"CNF-{section}-{train_a['train_id']}-{train_b['train_id']}-{now.strftime('%Y%m%dT%H%M%S')}",
                    "section": section,
                    "eta": eta_dt.isoformat(),
                    "eta_minutes": round(eta_minutes, 2),
                    "severity": _severity_for_eta(eta_minutes),
                    "trains_involved": [train_a["train_id"], train_b["train_id"]],
                    "predicted_at": now.isoformat(),
                }
            )

    conflicts.sort(key=lambda c: c["eta_minutes"])
    return conflicts
