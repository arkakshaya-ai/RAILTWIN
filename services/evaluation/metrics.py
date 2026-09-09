"""Task 7.2: real computed baseline-vs-AI evaluation metrics.

Runs `baseline_assign()` (Task 7.1) and the real anytime-wrapped joint-block
solver (`plan_tasks()`, Phase 3) over the *same* seeded task/slot dataset
(`seed_demo_defects()`/`seed_demo_slots()`, identical to what every other
route in this sandbox scores/plans over) and turns both outputs into the
five comparison numbers BUILD_SPEC's Phase 7 asks for. Every number here is
computed from actually running both planners -- nothing is hardcoded; see
`docs/evaluation_metrics.md` for a snapshot of one run's real output.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from services.block_optimizer.anytime_wrapper import plan_tasks
from services.evaluation.baseline_simulator import baseline_assign
from services.planning_api.demo_data import seed_demo_defects, seed_demo_slots
from services.priority_scoring.score import score_batch

# seed_demo_defects()/seed_demo_slots() both anchor reported_date/window
# generation on a shared `now` that defaults to the real current time, and
# due_date is always generated as now + [3, 30] days -- so with the real
# "now" as both the generation anchor *and* the "today" udm_schema.sql's
# `overdue` column compares against, due_date < today can never be true and
# the overdue-backlog metric would be a meaningless 0/0 by construction.
# Shifting the shared generation anchor this far into the past (same seed,
# same generator functions, applied identically to both planners -- still
# an "identical synthetic input") puts a real, non-trivial subset of the
# synthetic due_dates behind actual "today" while the generated slot
# windows still start from that same anchor, so slot_is_available()'s
# window_start >= reported_date check stays coherent.
_OVERDUE_SHIFT_DAYS = 20
_DEFAULT_WEEKS = 5


def _slot_minutes(slot: dict) -> float:
    start = datetime.fromisoformat(slot["window_start"])
    end = datetime.fromisoformat(slot["window_end"])
    return (end - start).total_seconds() / 60.0


def _windows_consumed_minutes(plans: list[dict], slot_by_id: dict[str, dict]) -> float:
    return sum(_slot_minutes(slot_by_id[p["slot_id"]]) for p in plans)


def _assigned_task_minutes(plans: list[dict], slot_by_id: dict[str, dict]) -> float:
    # Counts a shared slot's duration once per task assigned to it (not once
    # per slot) -- this is deliberately different from "downtime", and is
    # what makes joint-blocking show up as higher utilization: two tasks
    # sharing one window deliver twice the task-throughput for the same
    # corridor closure.
    return sum(len(p["task_ids"]) * _slot_minutes(slot_by_id[p["slot_id"]]) for p in plans)


def _assigned_task_ids(plans: list[dict]) -> set[str]:
    return {tid for p in plans for tid in p["task_ids"]}


def _joint_block_rate_pct(plans: list[dict]) -> float:
    if not plans:
        return 0.0
    joint = sum(1 for p in plans if len(p["task_ids"]) >= 2)
    return round(joint / len(plans) * 100.0, 2)


def _pct_reduction(before: float, after: float) -> float:
    if before == 0:
        return 0.0
    return round((before - after) / before * 100.0, 2)


def _pct_change(before: float, after: float) -> float:
    if before == 0:
        return 0.0 if after == 0 else 100.0
    return round((after - before) / before * 100.0, 2)


def compute_evaluation_metrics(seed: int = 42, weeks: int = _DEFAULT_WEEKS) -> dict:
    generation_now = datetime.now(timezone.utc) - timedelta(days=_OVERDUE_SHIFT_DAYS)
    today = date.today()

    tasks = seed_demo_defects(seed=seed, now=generation_now)
    slots = seed_demo_slots(seed=seed, weeks=weeks, now=generation_now)
    slot_by_id = {s["slot_id"]: s for s in slots}

    baseline_result = baseline_assign(tasks, slots)
    ai_result = plan_tasks(tasks, slots, horizon="weekly")

    baseline_plans = baseline_result["plans"]
    ai_plans = ai_result["plans"]

    # block_type="traffic" slots are never assignable (slot_is_available()
    # rejects them outright), so they are excluded from "available slot
    # time" -- counting them would understate utilization for both
    # approaches identically without reflecting any real capacity either
    # planner could ever have used.
    total_slot_minutes = sum(_slot_minutes(s) for s in slots if s.get("block_type") != "traffic")

    baseline_downtime = _windows_consumed_minutes(baseline_plans, slot_by_id)
    ai_downtime = _windows_consumed_minutes(ai_plans, slot_by_id)

    overdue_ids = {t["defect_id"] for t in tasks if date.fromisoformat(t["due_date"]) < today}

    baseline_assigned = _assigned_task_ids(baseline_plans)
    ai_assigned = _assigned_task_ids(ai_plans)

    baseline_overdue_burndown = (
        round(len(overdue_ids & baseline_assigned) / len(overdue_ids) * 100.0, 2) if overdue_ids else 0.0
    )
    ai_overdue_burndown = (
        round(len(overdue_ids & ai_assigned) / len(overdue_ids) * 100.0, 2) if overdue_ids else 0.0
    )

    baseline_utilization = (
        round(_assigned_task_minutes(baseline_plans, slot_by_id) / total_slot_minutes * 100.0, 2)
        if total_slot_minutes
        else 0.0
    )
    ai_utilization = (
        round(_assigned_task_minutes(ai_plans, slot_by_id) / total_slot_minutes * 100.0, 2)
        if total_slot_minutes
        else 0.0
    )

    baseline_joint_rate = _joint_block_rate_pct(baseline_plans)
    ai_joint_rate = _joint_block_rate_pct(ai_plans)

    # score_batch() scores every task regardless of whether it ends up
    # assigned, so "coverage" here is really "fraction of the whole backlog
    # that both received an ML priority score AND was actually scheduled" --
    # the baseline has no scoring concept at all, so its column reports the
    # analogous severity-only assignment coverage for contrast, not a true
    # ML score coverage number (see docs/evaluation_metrics.md).
    scored_ids = {s["defect_id"] for s in score_batch(tasks)}
    ai_priority_coverage = round(len(ai_assigned & scored_ids) / len(tasks) * 100.0, 2) if tasks else 0.0
    baseline_severity_coverage = round(len(baseline_assigned) / len(tasks) * 100.0, 2) if tasks else 0.0

    return {
        "seed": seed,
        "task_count": len(tasks),
        "slot_count": len(slots),
        "overdue_task_count": len(overdue_ids),
        "generation_now": generation_now.isoformat(),
        "evaluation_today": today.isoformat(),
        "baseline": {
            "downtime_minutes": round(baseline_downtime, 2),
            "overdue_backlog_burndown_pct": baseline_overdue_burndown,
            "block_utilization_pct": baseline_utilization,
            "joint_block_rate_pct": baseline_joint_rate,
            "priority_score_coverage_pct": baseline_severity_coverage,
            "unassigned_task_ids": baseline_result["unassigned_task_ids"],
        },
        "ai_optimized": {
            "downtime_minutes": round(ai_downtime, 2),
            "overdue_backlog_burndown_pct": ai_overdue_burndown,
            "block_utilization_pct": ai_utilization,
            "joint_block_rate_pct": ai_joint_rate,
            "priority_score_coverage_pct": ai_priority_coverage,
            "unassigned_task_ids": ai_result.get("unassigned_task_ids", []),
            "joint_pairs_forced": ai_result.get("joint_pairs_forced", []),
        },
        "improvement_pct": {
            "asset_downtime_reduction_pct": _pct_reduction(baseline_downtime, ai_downtime),
            "overdue_backlog_burndown_pct": _pct_change(baseline_overdue_burndown, ai_overdue_burndown),
            "block_utilization_efficiency_pct": _pct_change(baseline_utilization, ai_utilization),
            "joint_block_rate_pct": _pct_change(baseline_joint_rate, ai_joint_rate),
            "priority_score_coverage_pct": _pct_change(baseline_severity_coverage, ai_priority_coverage),
        },
    }
