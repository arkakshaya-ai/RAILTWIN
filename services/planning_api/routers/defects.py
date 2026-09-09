"""GET /defects.

Reads live `defect_task` rows (written by `udm_writer.py` from
`defect.tms/smms/tdms.v1`) via `engine`, and runs them through both Phase 2
models -- `score_batch` (priority) and `score_defects` (escalation risk) --
merging the two per `defect_id`, exactly like `routers/blockplan.py`'s
DB-first/fallback pattern. If the DB is unreachable or has no rows yet (a
fresh deployment before any defect events have arrived, or this sandbox with
no live Postgres), falls back to `SEED_DEMO_DATA`'s fixed-seed batch so the
route is never empty in a demo.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends
from sqlalchemy import select

from services.failure_prediction.escalation_model import score_defects
from services.ingestion.udm_writer import defect_task_table
from services.planning_api.demo_data import SEED_DEMO_DATA, seed_demo_defects
from services.planning_api.deps import get_engine
from services.planning_api.models import DefectPriority, DefectsResponse
from services.priority_scoring.score import score_batch, write_scores_to_db

logger = logging.getLogger(__name__)

router = APIRouter()

_demo_defects_cache: list[dict] | None = None


def _demo_defects() -> list[dict]:
    global _demo_defects_cache
    if _demo_defects_cache is None:
        _demo_defects_cache = seed_demo_defects()
    return _demo_defects_cache


def _read_live_defects(engine) -> list[dict]:
    with engine.connect() as conn:
        rows = conn.execute(select(defect_task_table)).mappings().all()
    return [dict(row) for row in rows]


@router.get("/defects", response_model=DefectsResponse)
def get_defects(engine=Depends(get_engine)) -> DefectsResponse:
    try:
        defects = _read_live_defects(engine)
    except Exception as exc:
        logger.warning("defects: DB read failed, falling back to demo data: %s", exc)
        defects = []

    if not defects and SEED_DEMO_DATA:
        defects = _demo_defects()

    priority_scores = score_batch(defects)
    try:
        write_scores_to_db(priority_scores, engine)
    except Exception as exc:
        logger.warning("defects: failed to persist priority scores: %s", exc)
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
