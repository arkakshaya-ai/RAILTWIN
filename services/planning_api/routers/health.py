"""GET /health. See services/planning_api/health.py for the self-check logic."""
from __future__ import annotations

from fastapi import APIRouter

from services.planning_api import health as health_module
from services.planning_api.models import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    return HealthResponse(**health_module.get_health_state())
