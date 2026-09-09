"""Instant rule-based resolution when the deep CP-SAT optimizer produces nothing.

`traffic_optimizer.anytime_wrapper.resolve_conflict` can legitimately come
back with `fail_safe=True` and an empty `options` list -- the hard
wall-clock guard in `services/common/anytime.py` fired before CP-SAT
returned even one candidate for `safety_validation.filter_candidates` to
pass. Leaving a controller with nothing actionable at that moment is worse
than handing them the single most conservative move available: hold the
lower-priority train. This module is the documented fast/deep latency-tier
fallback -- no solver, no safety-gate machinery, must return in well under a
millisecond so it can be appended unconditionally without itself risking a
timeout.
"""
from __future__ import annotations

from services.traffic_optimizer.solver import DEFAULT_PRIORITY_WEIGHT, DEFAULT_PRIORITY_WEIGHTS

FALLBACK_GATE_NAME = "fast_tier_fallback"


def _priority_weight(train: dict) -> float:
    cls = (train.get("priority_class") or "").lower()
    return DEFAULT_PRIORITY_WEIGHTS.get(cls, DEFAULT_PRIORITY_WEIGHT)


def fallback_resolution(conflict: dict) -> dict:
    """Hold the train with the lower priority-class weight.

    Ties (equal weight, e.g. two trains of the same class, or neither
    train's class recognized) break by `train_id` rather than by ETA or
    solver output -- both of those are exactly the data this fallback fires
    because the deep tier failed to produce in time, so ETA/order fields on
    the conflict may be stale or absent. `train_id` is always present and
    gives a stable, reproducible choice.
    """
    trains = conflict.get("trains", [])
    if len(trains) < 2:
        raise ValueError("fallback_resolution requires at least two trains")

    held = min(trains, key=lambda t: (_priority_weight(t), t["train_id"]))

    return {
        "action": "hold",
        "score": 0.0,
        "rationale": (
            f"fast-tier fallback: hold {held['train_id']} (lowest priority class) "
            "at current block -- deep re-optimization did not complete within budget"
        ),
        "constraints_checked": [FALLBACK_GATE_NAME],
        "train_held": held["train_id"],
    }
