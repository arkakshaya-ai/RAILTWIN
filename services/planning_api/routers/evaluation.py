"""GET /evaluation/blockplan (Task 7.3 wiring for the Feature 5 before/after toggle).

Purely additive: a new route under the existing `/api/v1` prefix, alongside
Section-5's routers, none of which this touches. Runs the real baseline-vs-
AI comparison (`compute_evaluation_metrics()`, Task 7.2) on every request --
cheap enough (well under a second on the seeded 24-defect/5-week dataset,
see `tests/test_evaluation.py`) that there is no need for the DB-row/
fallback-solve split `blockplan.py` uses for persisted plans.
"""
from __future__ import annotations

from fastapi import APIRouter

from services.evaluation.metrics import compute_evaluation_metrics
from services.planning_api.models import EvaluationMetricsResponse

router = APIRouter()


@router.get("/evaluation/blockplan", response_model=EvaluationMetricsResponse)
def get_evaluation_blockplan() -> EvaluationMetricsResponse:
    return EvaluationMetricsResponse(**compute_evaluation_metrics())
