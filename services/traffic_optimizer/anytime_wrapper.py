"""Budgeted, never-hanging entry point wrapping solver.py + safety_validation.py.

Shapes its return value to the `/api/v1/conflicts/{id}/options` contract
(`{"options": [...]}` with each option carrying `constraints_checked`) so
Phase 4's route handler can call this directly.
"""
from __future__ import annotations

from services.common.anytime import DEFAULT_TIME_BUDGET_SECONDS, run_anytime
from services.traffic_optimizer import safety_validation, solver


def resolve_conflict(
    conflict: dict,
    time_budget_seconds: float = DEFAULT_TIME_BUDGET_SECONDS,
    speed_restriction_kmph: float = safety_validation.DEFAULT_SPEED_RESTRICTION_KMPH,
    headway_minutes: float = solver.DEFAULT_MIN_HEADWAY_MINUTES,
) -> dict:
    def _run(budget: float) -> dict:
        solved = solver.solve(conflict, time_budget_seconds=budget, headway_minutes=headway_minutes)
        filtered = safety_validation.filter_candidates(
            solved["candidates"],
            conflict,
            speed_restriction_kmph=speed_restriction_kmph,
            min_headway_minutes=headway_minutes,
        )
        return {
            "options": filtered["options"],
            "rejected": filtered["rejected"],
            "proven_optimal": solved["proven_optimal"],
            "baseline_delay_min": solved["baseline_delay_min"],
        }

    return run_anytime(_run, time_budget_seconds=time_budget_seconds)
