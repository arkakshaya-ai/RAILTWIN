"""Hard safety gates applied to solver.py's ranked candidates.

Every check here is a structural filter: a candidate either passes and is
annotated with which gates it cleared, or it is dropped into `rejected` with
a reason. None of these ever adjust `score` -- soft-penalizing an unsafe
option would still let it surface to a controller, which is exactly what
this NFR forbids.
"""
from __future__ import annotations

DEFAULT_SPEED_RESTRICTION_KMPH = 100.0

# Hours of Employment Regulations cap continuous running duty; 8 hours is
# the conservative statutory ceiling for train crew, expressed in minutes
# so it compares directly against `crew_duty_minutes`.
MAX_CREW_DUTY_MINUTES = 8 * 60

# Invented reference table (mirrors solver.py's ALTERNATE_ROUTES): freight
# consists are not cleared for loop-line diversion on these sections because
# the loop turnouts here are not rated for freight axle loads.
LOCO_ROUTE_RESTRICTIONS = {
    "SEC-B-LOOP": {"freight"},
    "SEC-C-LOOP": {"freight"},
}

GATE_NAMES = (
    "route_locking_compatibility",
    "loco_route_compat",
    "hoer_duty_rest",
    "speed_restriction",
)


def check_route_locking_compatibility(candidate: dict, min_headway_minutes: float) -> bool:
    starts = candidate.get("resolved_start_min", {})
    train_ids = list(starts.keys())
    for i, a in enumerate(train_ids):
        for b in train_ids[i + 1 :]:
            if abs(starts[a] - starts[b]) < min_headway_minutes - 1e-6:
                return False
    return True


def check_loco_route_compatibility(candidate: dict, trains_by_id: dict) -> bool:
    rerouted = candidate.get("rerouted_train")
    if not rerouted:
        return True
    target_route = candidate.get("action") == "reroute"
    if not target_route:
        return True
    train_class = (trains_by_id.get(rerouted, {}).get("priority_class") or "").lower()
    restricted_classes = set()
    for restricted in LOCO_ROUTE_RESTRICTIONS.values():
        restricted_classes |= restricted
    return train_class not in restricted_classes


def check_hoer_duty_rest(candidate: dict, trains_by_id: dict, max_duty_minutes: float = MAX_CREW_DUTY_MINUTES) -> bool:
    for train_id, elapsed_duty in candidate.get("crew_duty_minutes", {}).items():
        extra_wait = max(0.0, candidate.get("resolved_start_min", {}).get(train_id, 0.0) - candidate.get("eta_min", {}).get(train_id, 0.0))
        projected_duty = elapsed_duty + extra_wait
        if projected_duty > max_duty_minutes:
            return False
    return True


def check_speed_restriction(candidate: dict, speed_restriction_kmph: float) -> bool:
    return candidate.get("implied_speed_kmph", 0.0) <= speed_restriction_kmph


_CHECKS = {
    "route_locking_compatibility": lambda c, ctx: check_route_locking_compatibility(c, ctx["min_headway_minutes"]),
    "loco_route_compat": lambda c, ctx: check_loco_route_compatibility(c, ctx["trains_by_id"]),
    "hoer_duty_rest": lambda c, ctx: check_hoer_duty_rest(c, ctx["trains_by_id"], ctx["max_duty_minutes"]),
    "speed_restriction": lambda c, ctx: check_speed_restriction(c, ctx["speed_restriction_kmph"]),
}


def filter_candidates(
    candidates: list[dict],
    conflict: dict,
    speed_restriction_kmph: float = DEFAULT_SPEED_RESTRICTION_KMPH,
    min_headway_minutes: float = 5.0,
    max_duty_minutes: float = MAX_CREW_DUTY_MINUTES,
) -> dict:
    trains_by_id = {t["train_id"]: t for t in conflict.get("trains", [])}
    ctx = {
        "trains_by_id": trains_by_id,
        "min_headway_minutes": min_headway_minutes,
        "max_duty_minutes": max_duty_minutes,
        "speed_restriction_kmph": speed_restriction_kmph,
    }

    survivors = []
    rejected = []
    for candidate in candidates:
        passed = []
        reasons = []
        for name in GATE_NAMES:
            if _CHECKS[name](candidate, ctx):
                passed.append(name)
            else:
                reasons.append(name)
        if reasons:
            rejected.append({**candidate, "rejected_gates": reasons})
        else:
            survivors.append({**candidate, "constraints_checked": passed})

    survivors.sort(key=lambda c: c["score"], reverse=True)
    return {"options": survivors, "rejected": rejected}
