"""GET /defects.

No live Postgres in this sandbox, so `defect_task` is empty at runtime here.
`SEED_DEMO_DATA` (default true, see `services/planning_api/demo_data.py`)
seeds a small fixed-seed defect batch and this route runs it through both
Phase 2 models -- `score_batch` (priority) and `score_defects` (escalation
risk) -- merging the two per `defect_id`. A real deployment sets
`SEED_DEMO_DATA=false`; wiring this route to read live `defect_task` rows
instead is a small follow-up (`score_batch`/`write_scores_to_db` already
support a real-engine path) left for when a live Postgres is actually
available to read from.
"""
from __future__ import annotations

from fastapi import APIRouter

from services.failure_prediction.escalation_model import score_defects
from services.planning_api.demo_data import SEED_DEMO_DATA, seed_demo_defects
from services.planning_api.models import DefectPriority, DefectsResponse
from services.priority_scoring.score import score_batch

router = APIRouter()

_demo_defects_cache: list[dict] | None = None


def _demo_defects() -> list[dict]:
    global _demo_defects_cache
    if _demo_defects_cache is None:
        _demo_defects_cache = seed_demo_defects()
    return _demo_defects_cache


@router.get("/defects", response_model=DefectsResponse)
def get_defects() -> DefectsResponse:
    defects = _demo_defects() if SEED_DEMO_DATA else []

    priority_scores = score_batch(defects)
    # No live hot-box time series in this sandbox either; empty per-asset
    # history is a valid input (compute_sensor_trend_features degrades to
    # its zero-signal defaults), not a special case this route has to guard.
    escalation_scores = score_defects(defects, sensor_history_by_asset={})
    escalation_by_id = {s["defect_id"]: s["escalation_risk"] for s in escalation_scores}

    merged = [
        DefectPriority(
            defect_id=s["defect_id"],
            priority_score=s["priority_score"],
            top_features=s["top_features"],
            escalation_risk=escalation_by_id.get(s["defect_id"]),
        )
        for s in priority_scores
    ]
    return DefectsResponse(defects=merged)
