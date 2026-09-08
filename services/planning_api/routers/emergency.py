"""POST /emergency/trigger.

Intentional Phase-4 stub: only establishes the route contract
(`{status, reoptimization_id}`) so the frontend and Phase 6 can build against
it now. Task 6.4 (Phase 6) replaces the body with a real joint
traffic+block re-optimization (conflict resolution and block-plan
disruption handling run together); nothing here does that yet.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter

from services.planning_api.models import EmergencyTriggerRequest, EmergencyTriggerResponse

router = APIRouter()


@router.post("/emergency/trigger", response_model=EmergencyTriggerResponse)
def trigger_emergency(body: EmergencyTriggerRequest) -> EmergencyTriggerResponse:
    reoptimization_id = f"REOPT-{uuid.uuid4().hex[:12]}"
    return EmergencyTriggerResponse(status="triggered", reoptimization_id=reoptimization_id)
