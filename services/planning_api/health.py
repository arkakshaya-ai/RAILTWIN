"""AI-engine self-check backing `GET /api/v1/health`.

Phase 4 scope: one combined check that the three prediction/scoring modules
actually import and their core entry points are callable on synthetic
inputs -- a real self-test, not a hardcoded "up". Task 6.1 (Phase 6) will
replace/extend this with real per-service heartbeats (conflict prediction,
priority scoring, failure prediction each reporting their own up/down and
latency) rather than one combined flag.
"""
from __future__ import annotations

import logging
import threading
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

SELF_CHECK_INTERVAL_SECONDS = 30.0

_lock = threading.Lock()
_last_heartbeat: str | None = None
_ai_engine_up: bool = False


def run_self_check() -> bool:
    global _last_heartbeat, _ai_engine_up
    try:
        from services.conflict_prediction.fast_tier import predict_conflicts
        from services.failure_prediction.escalation_model import score_defects
        from services.priority_scoring.score import score_batch

        predict_conflicts({}, lookahead_minutes=1.0)
        score_batch([])
        score_defects([], {})
        ok = True
    except Exception as exc:
        logger.warning("AI engine self-check failed: %s", exc)
        ok = False

    with _lock:
        _last_heartbeat = datetime.now(timezone.utc).isoformat()
        _ai_engine_up = ok
    return ok


def get_health_state() -> dict:
    with _lock:
        return {"ai_engine": "up" if _ai_engine_up else "down", "last_heartbeat": _last_heartbeat}
