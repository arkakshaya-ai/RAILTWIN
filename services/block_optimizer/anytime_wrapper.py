"""Budgeted, never-hanging entry point wrapping joint_block_logic.py.

Reuses services.common.anytime.run_anytime -- the same hard wall-clock guard
traffic_optimizer uses -- rather than re-implementing the timeout pattern.
"""
from __future__ import annotations

from services.block_optimizer import joint_block_logic
from services.common.anytime import DEFAULT_TIME_BUDGET_SECONDS, run_anytime


def plan_tasks(
    tasks: list[dict],
    slots: list[dict],
    reserved_windows: list[dict] | None = None,
    precedence: list[tuple[str, str]] | None = None,
    max_concurrent_per_department: int = 2,
    safety_buffer_minutes: float = 30,
    horizon: str = "weekly",
    time_budget_seconds: float = DEFAULT_TIME_BUDGET_SECONDS,
) -> dict:
    def _run(budget: float) -> dict:
        result = joint_block_logic.solve_with_joint_preference(
            tasks,
            slots,
            reserved_windows=reserved_windows,
            precedence=precedence,
            max_concurrent_per_department=max_concurrent_per_department,
            safety_buffer_minutes=safety_buffer_minutes,
            horizon=horizon,
            time_budget_seconds=budget,
        )
        return result

    return run_anytime(_run, time_budget_seconds=time_budget_seconds)
