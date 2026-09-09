"""POST /emergency/trigger.

Task 6.4: real joint traffic + block re-optimization. Given a disrupted
`section`/`asset_id`, this finds the affected conflicts and block tasks and
resolves both together in one call, rather than the Phase-4 stub that only
minted an id.

Time budget: a fixed EMERGENCY_TIME_BUDGET_SECONDS is split evenly between
the two engines (not each defaulting to its own full budget) so the total
worst-case wall-clock for one call stays bounded by roughly
EMERGENCY_TIME_BUDGET_SECONDS + 2*FIXED_OVERHEAD_SECONDS regardless of how
many conflicts/tasks the section happens to have -- an emergency call needs
a predictable ceiling, not a ceiling that grows with the size of the
disruption. Traffic conflicts are bounded the same way: only the single
most-severe (soonest ETA) conflict is resolved with `resolve_conflict`
rather than one solver call per conflict, since `predict_conflicts` already
sorts by urgency and a controller reacting to an emergency needs the most
urgent answer inside the budget, not every conflict solved exhaustively.
Block tasks, by contrast, are all passed to a single `plan_tasks` call
together -- that solver is already built to plan a whole task batch at
once, so splitting it per-task would only add solver-call overhead for no
benefit.
"""
from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter

from services.block_optimizer.anytime_wrapper import plan_tasks
from services.conflict_prediction.fast_tier import predict_conflicts
from services.digital_twin.api import digital_twin_api
from services.digital_twin.weather_store import weather_store
from services.planning_api.demo_data import seed_demo_defects, seed_demo_slots
from services.planning_api.models import EmergencyTriggerRequest, EmergencyTriggerResponse
from services.planning_api.train_enrichment import enrich_trains
from services.producers.reference_data import ASSETS
from services.traffic_optimizer.anytime_wrapper import resolve_conflict

logger = logging.getLogger(__name__)

router = APIRouter()

EMERGENCY_TIME_BUDGET_SECONDS = 10.0
TRAFFIC_TIME_BUDGET_SECONDS = EMERGENCY_TIME_BUDGET_SECONDS / 2.0
BLOCK_TIME_BUDGET_SECONDS = EMERGENCY_TIME_BUDGET_SECONDS / 2.0

_SECTION_BY_ASSET_ID = {a["asset_id"]: a["section"] for a in ASSETS}


def _affected_conflicts(section: str | None) -> list[dict]:
    network_state = digital_twin_api.get_network_state()
    conflicts = predict_conflicts(network_state)
    if section is not None:
        conflicts = [c for c in conflicts if c["section"] == section]
    return conflicts


def _affected_tasks(section: str | None, asset_id: str | None) -> list[dict]:
    # No live defect_task DB in this sandbox (same reasoning as
    # routers/defects.py) -- reuse the same fixed-seed demo dataset so an
    # emergency trigger has real, reproducible tasks to plan around.
    tasks = seed_demo_defects()
    if asset_id is not None:
        tasks = [t for t in tasks if t.get("asset_id") == asset_id]
    elif section is not None:
        tasks = [t for t in tasks if _SECTION_BY_ASSET_ID.get(t.get("asset_id")) == section]
    return tasks


def _resolve_most_severe_conflict(conflicts: list[dict], section_hint: str | None) -> dict | None:
    if not conflicts:
        return None
    most_severe = conflicts[0]
    network_state = digital_twin_api.get_network_state()
    section_trains = network_state.get(most_severe["section"], {}).get("trains", [])
    involved_ids = set(most_severe["trains_involved"])
    trains = [t for t in section_trains if t["train_id"] in involved_ids]
    if len(trains) < 2:
        return None

    conflict = {"section": most_severe["section"], "trains": enrich_trains(trains)}
    speed_restriction_kmph = weather_store.effective_speed_restriction_kmph(most_severe["section"])
    return resolve_conflict(
        conflict,
        time_budget_seconds=TRAFFIC_TIME_BUDGET_SECONDS,
        speed_restriction_kmph=speed_restriction_kmph,
    )


@router.post("/emergency/trigger", response_model=EmergencyTriggerResponse)
def trigger_emergency(body: EmergencyTriggerRequest) -> EmergencyTriggerResponse:
    reoptimization_id = f"REOPT-{uuid.uuid4().hex[:12]}"

    conflicts = _affected_conflicts(body.section)
    tasks = _affected_tasks(body.section, body.asset_id)

    traffic_solve = _resolve_most_severe_conflict(conflicts, body.section)
    traffic_result = {
        "conflicts_detected": len(conflicts),
        "conflicts_handled": 1 if traffic_solve is not None else 0,
        "options": traffic_solve.get("options", []) if traffic_solve is not None else [],
    }

    block_solve: dict = {}
    if tasks:
        slots = seed_demo_slots(weeks=2)
        block_solve = plan_tasks(tasks, slots, time_budget_seconds=BLOCK_TIME_BUDGET_SECONDS)
    block_result = {
        "tasks_considered": len(tasks),
        "plans": block_solve.get("plans", []),
        "unassigned_task_ids": block_solve.get("unassigned_task_ids", []),
    }

    return EmergencyTriggerResponse(
        status="triggered",
        reoptimization_id=reoptimization_id,
        traffic_result=traffic_result,
        block_result=block_result,
    )
