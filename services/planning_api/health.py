"""AI-engine self-check backing `GET /api/v1/health`.

Task 6.1 (Phase 6): three independent per-service checks (conflict
prediction, priority scoring, failure prediction) instead of one combined
flag -- each reports its own up/down, latency, and last-checked timestamp so
a controller (and the dashboard's per-service indicators) can see exactly
which AI sub-service degraded rather than only "the AI engine is down"
somewhere. `ai_engine`/`last_heartbeat` stay the aggregate the dashboard's
existing top-level banner already depends on: `ai_engine` is "down" if ANY
sub-service check fails, so that meaning is unchanged from Phase 4.

Each `_check_*` closure re-imports its target function from the target
module on every call (rather than importing at module load time) so a test
that monkeypatches e.g. `services.conflict_prediction.fast_tier.predict_conflicts`
is picked up on the very next self-check -- the same pattern Phase 4's
single combined check already used.
"""
from __future__ import annotations

import logging
import threading
import time
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

SELF_CHECK_INTERVAL_SECONDS = 30.0


def _check_conflict_prediction() -> None:
    from services.conflict_prediction.fast_tier import predict_conflicts

    predict_conflicts({}, lookahead_minutes=1.0)


def _check_priority_scoring() -> None:
    from services.priority_scoring.score import score_batch

    score_batch([])


def _check_failure_prediction() -> None:
    from services.failure_prediction.escalation_model import score_defects

    score_defects([], {})


_SERVICE_CHECKS = {
    "conflict_prediction": _check_conflict_prediction,
    "priority_scoring": _check_priority_scoring,
    "failure_prediction": _check_failure_prediction,
}

_lock = threading.Lock()
_last_heartbeat: str | None = None
_ai_engine_up: bool = False
_services_state: dict[str, dict] = {}


def _run_one_check(name: str, check_fn) -> tuple[bool, dict]:
    started = time.monotonic()
    try:
        check_fn()
        ok = True
    except Exception as exc:
        logger.warning("%s self-check failed: %s", name, exc)
        ok = False
    latency_ms = (time.monotonic() - started) * 1000.0
    entry = {
        "status": "up" if ok else "down",
        "latency_ms": round(latency_ms, 3),
        "last_heartbeat": datetime.now(timezone.utc).isoformat(),
    }
    return ok, entry


def run_self_check() -> bool:
    global _last_heartbeat, _ai_engine_up, _services_state

    services_state: dict[str, dict] = {}
    all_ok = True
    for name, check_fn in _SERVICE_CHECKS.items():
        ok, entry = _run_one_check(name, check_fn)
        services_state[name] = entry
        all_ok = all_ok and ok

    with _lock:
        _last_heartbeat = datetime.now(timezone.utc).isoformat()
        _ai_engine_up = all_ok
        _services_state = services_state
    return all_ok


def get_health_state() -> dict:
    with _lock:
        return {
            "ai_engine": "up" if _ai_engine_up else "down",
            "last_heartbeat": _last_heartbeat,
            "services": dict(_services_state),
        }
