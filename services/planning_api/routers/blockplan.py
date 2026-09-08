"""GET /blockplan/weekly and GET /blockplan/monthly.

Reads the latest persisted `block_plan` rows for that horizon (written by
`services/scheduling/jobs.py`'s cron jobs); if none exist yet (fresh DB) or
the DB is unreachable, falls back to solving the demo task/slot dataset
on-the-spot with `plan_tasks(..., horizon=...)` so the endpoint is never
empty in this sandboxed demo. The response's `source` field says which path
actually fired: `"db"` or `"fallback_solve"`.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends
from sqlalchemy import select

from services.block_optimizer.anytime_wrapper import plan_tasks
from services.ingestion.udm_writer import block_plan_table, corridor_block_slot_table
from services.planning_api.demo_data import seed_demo_defects, seed_demo_slots
from services.planning_api.deps import get_engine
from services.planning_api.models import (
    BlockPlanSection,
    BlockPlanSlot,
    MonthlyBlockPlanResponse,
    WeeklyBlockPlanResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()


def _read_plan_rows(engine, horizon: str) -> list[dict]:
    with engine.connect() as conn:
        plan_rows = conn.execute(
            select(block_plan_table).where(block_plan_table.c.horizon == horizon)
        ).mappings().all()
        slot_rows = conn.execute(select(corridor_block_slot_table)).mappings().all()

    slot_by_id = {r["slot_id"]: dict(r) for r in slot_rows}
    return [_with_slot_info(dict(row), slot_by_id.get(row["slot_id"], {})) for row in plan_rows]


def _with_slot_info(plan: dict, slot: dict) -> dict:
    plan["section"] = slot.get("section")
    plan["window_start"] = slot.get("window_start")
    plan["window_end"] = slot.get("window_end")
    return plan


def _fallback_solve(horizon: str, weeks: int, week_offset: int = 0) -> list[dict]:
    tasks = seed_demo_defects()
    slots = seed_demo_slots(weeks=weeks, week_offset=week_offset)
    result = plan_tasks(tasks, slots, horizon=horizon, time_budget_seconds=10.0)

    slot_by_id = {s["slot_id"]: s for s in slots}
    return [_with_slot_info(dict(plan), slot_by_id.get(plan["slot_id"], {})) for plan in result.get("plans", [])]


@router.get("/blockplan/weekly", response_model=WeeklyBlockPlanResponse)
def get_weekly_block_plan(engine=Depends(get_engine)) -> WeeklyBlockPlanResponse:
    source = "db"
    try:
        plans = _read_plan_rows(engine, "weekly")
    except Exception as exc:
        logger.warning("blockplan/weekly: DB read failed, falling back to on-demand solve: %s", exc)
        plans = []

    if not plans:
        source = "fallback_solve"
        plans = _fallback_solve("weekly", weeks=2)

    slots = [
        BlockPlanSlot(
            slot_id=p["slot_id"],
            section=p.get("section"),
            window_start=p.get("window_start"),
            window_end=p.get("window_end"),
            departments=list(p["departments"]),
            task_ids=list(p["task_ids"]),
        )
        for p in plans
    ]
    return WeeklyBlockPlanResponse(plan_id="BLOCKPLAN-WEEKLY", slots=slots, source=source)


@router.get("/blockplan/monthly", response_model=MonthlyBlockPlanResponse)
def get_monthly_block_plan(engine=Depends(get_engine)) -> MonthlyBlockPlanResponse:
    source = "db"
    try:
        plans = _read_plan_rows(engine, "monthly")
    except Exception as exc:
        logger.warning("blockplan/monthly: DB read failed, falling back to on-demand solve: %s", exc)
        plans = []

    if not plans:
        source = "fallback_solve"
        plans = _fallback_solve("monthly", weeks=5)

    by_section: dict[str, dict] = {}
    for p in plans:
        section = p.get("section") or "UNKNOWN"
        bucket = by_section.setdefault(
            section, {"section": section, "departments": set(), "task_ids": [], "slot_ids": []}
        )
        bucket["departments"].update(p["departments"])
        bucket["task_ids"].extend(p["task_ids"])
        bucket["slot_ids"].append(p["slot_id"])

    sections = [
        BlockPlanSection(
            section=b["section"],
            departments=sorted(b["departments"]),
            task_ids=sorted(b["task_ids"]),
            slot_ids=sorted(b["slot_ids"]),
        )
        for b in by_section.values()
    ]
    return MonthlyBlockPlanResponse(plan_id="BLOCKPLAN-MONTHLY", sections=sections, source=source)
