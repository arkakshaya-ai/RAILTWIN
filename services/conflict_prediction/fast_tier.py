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
from typing import Callable, Optional

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


def _capped_speed(speed_kmph: float, speed_cap_kmph: float | None) -> float:
    if speed_cap_kmph is None:
        return speed_kmph
    return min(speed_kmph, speed_cap_kmph)


def _time_to_convergence_minutes(
    train_a: dict, train_b: dict, speed_cap_kmph: float | None = None
) -> float | None:
    # `speed_cap_kmph` (Task 6.3) is the section's weather-effective speed
    # restriction: a train physically cannot close distance faster than that,
    # so a severe restriction lengthens (or removes) an otherwise-imminent
    # convergence exactly like it would in reality -- trains forced to slow
    # down take longer to reach each other. None (the default) reproduces
    # Phase-4 behavior exactly since min(speed, None-guarded-away) is a no-op.
    pos_a, pos_b = train_a["chainage_km"], train_b["chainage_km"]
    speed_a = _capped_speed(train_a["speed_kmph"], speed_cap_kmph)
    speed_b = _capped_speed(train_b["speed_kmph"], speed_cap_kmph)
    dir_a, dir_b = train_a["direction"], train_b["direction"]

    if pos_a == pos_b:
        return 0.0

    if dir_a != dir_b:
        if pos_a < pos_b:
            lower_dir, lower_speed = dir_a, speed_a
            upper_dir, upper_speed = dir_b, speed_b
        else:
            lower_dir, lower_speed = dir_b, speed_b
            upper_dir, upper_speed = dir_a, speed_a
        if lower_dir != "UP" or upper_dir != "DOWN":
            return None
        closing_speed = lower_speed + upper_speed
        if closing_speed <= 0:
            return None
        distance_km = abs(pos_b - pos_a)
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
    weather_lookup: Optional[Callable[[str], Optional[float]]] = None,
) -> list[dict]:
    """`weather_lookup(section) -> speed_cap_kmph | None` (Task 6.3) is an
    optional per-section weather-effective-speed-restriction lookup, e.g.
    `services.digital_twin.weather_store.weather_store.effective_speed_restriction_kmph`.
    Omitting it (the default) leaves convergence timing exactly as it was
    before Task 6.3 -- callers that don't know or care about weather (the
    existing 11 conflict-prediction tests included) are unaffected.
    """
    now = now or datetime.now(timezone.utc)
    conflicts: list[dict] = []

    for section, section_state in network_state.items():
        trains = section_state.get("trains", [])
        speed_cap_kmph = weather_lookup(section) if weather_lookup is not None else None
        for train_a, train_b in itertools.combinations(trains, 2):
            eta_minutes = _time_to_convergence_minutes(train_a, train_b, speed_cap_kmph=speed_cap_kmph)
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
