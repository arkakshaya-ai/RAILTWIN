"""Task 4.2: apscheduler jobs that regenerate block plans and persist them.

Two cadences: the *weekly*-horizon plan is re-solved daily (a short-horizon
plan goes stale fast as new defects/slots appear), the *monthly*-horizon
plan is re-solved weekly (a longer horizon changes less often, so daily
re-solves would just burn CP-SAT time for no new information). Each job
function is a plain, synchronously callable Python function taking an
`Engine` -- not only reachable through a `BackgroundScheduler` closure -- so
a test can call `run_weekly_block_plan_job(engine)` directly and assert on
the row it writes without waiting on real cron timing, per Task 4.2's stated
acceptance approach.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import Engine

from services.block_optimizer.anytime_wrapper import plan_tasks
from services.ingestion.udm_writer import block_plan_table, portable_upsert
from services.planning_api.demo_data import seed_demo_defects, seed_demo_slots

logger = logging.getLogger(__name__)

WEEKLY_HORIZON = "weekly"
MONTHLY_HORIZON = "monthly"

WEEKLY_JOB_ID = "weekly_block_plan_regeneration"
MONTHLY_JOB_ID = "monthly_block_plan_regeneration"

# Daily re-solve for the weekly-horizon plan, weekly re-solve for the
# monthly-horizon plan -- see module docstring for why cadence is inverted
# relative to horizon length.
WEEKLY_PLAN_CRON = {"hour": 2, "minute": 0}
MONTHLY_PLAN_CRON = {"day_of_week": "sun", "hour": 3, "minute": 0}


def _persist_plans(engine: Engine, plans: list[dict]) -> list[str]:
    generated_at = datetime.now(timezone.utc).isoformat()
    written = []
    with engine.begin() as conn:
        for plan in plans:
            row = {
                # solver.py derives plan_id deterministically from slot_id
                # alone (f"PLAN-{slot_id}"), with no horizon in it -- the
                # same slot can legitimately appear in both a weekly-horizon
                # and a monthly-horizon solve, which would otherwise collide
                # on block_plan's plan_id primary key and let one horizon's
                # row silently clobber the other's. Prefixing with horizon
                # here (DB-layer only; solver.py's own output is untouched)
                # keeps the two horizons' rows independent.
                "plan_id": f"{plan['horizon']}-{plan['plan_id']}",
                "horizon": plan["horizon"],
                "slot_id": plan["slot_id"],
                "departments": list(plan["departments"]),
                "task_ids": list(plan["task_ids"]),
                "generated_at": generated_at,
            }
            portable_upsert(conn, block_plan_table, row, "plan_id")
            written.append(row["plan_id"])
    return written


def run_weekly_block_plan_job(engine: Engine) -> dict:
    tasks = seed_demo_defects()
    slots = seed_demo_slots(weeks=2)
    result = plan_tasks(tasks, slots, horizon=WEEKLY_HORIZON, time_budget_seconds=10.0)
    written = _persist_plans(engine, result.get("plans", []))
    logger.info("weekly block-plan job wrote %d plan row(s)", len(written))
    return {**result, "written_plan_ids": written}


def run_monthly_block_plan_job(engine: Engine) -> dict:
    tasks = seed_demo_defects()
    slots = seed_demo_slots(weeks=5)
    result = plan_tasks(tasks, slots, horizon=MONTHLY_HORIZON, time_budget_seconds=10.0)
    written = _persist_plans(engine, result.get("plans", []))
    logger.info("monthly block-plan job wrote %d plan row(s)", len(written))
    return {**result, "written_plan_ids": written}


def start_scheduler(engine: Engine) -> BackgroundScheduler:
    scheduler = BackgroundScheduler(timezone="UTC")
    scheduler.add_job(
        run_weekly_block_plan_job,
        CronTrigger(**WEEKLY_PLAN_CRON),
        args=[engine],
        id=WEEKLY_JOB_ID,
        replace_existing=True,
    )
    scheduler.add_job(
        run_monthly_block_plan_job,
        CronTrigger(**MONTHLY_PLAN_CRON),
        args=[engine],
        id=MONTHLY_JOB_ID,
        replace_existing=True,
    )
    scheduler.start()
    return scheduler
