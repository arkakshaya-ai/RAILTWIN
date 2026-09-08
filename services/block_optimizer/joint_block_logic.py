"""Prefers combining same-chainage, cross-department tasks into one slot.

Two-pass strategy, not an objective-function bonus: pass 1 *forces* every
detected joint-candidate pair into a shared slot (via solver.py's
`forced_pairs` hook) and pass 2 is the plain unconstrained solve, used only
if pass 1 comes back infeasible. A forcing constraint gives a clean,
deterministic "these were combined because a valid shared slot existed"
story -- an objective-bonus can get outweighed by the urgency term for
unrelated tasks and silently fail to combine even when combination was
possible, which is much harder to reason about (and to test) than a
solver.Solve() status.
"""
from __future__ import annotations

from services.block_optimizer import solver as block_solver
from services.producers.reference_data import ASSETS

_CHAINAGE_BY_ASSET = {a["asset_id"]: a["chainage_km"] for a in ASSETS}


def _chainage_for_task(task: dict) -> float | None:
    if "chainage_km" in task and task["chainage_km"] is not None:
        return float(task["chainage_km"])
    return _CHAINAGE_BY_ASSET.get(task.get("asset_id"))


def _windows_overlap(task_a: dict, task_b: dict) -> bool:
    return not (task_a["due_date"] < task_b["reported_date"] or task_b["due_date"] < task_a["reported_date"])


def _has_combinable_slot(task_a: dict, task_b: dict, slots: list[dict], reserved_windows: list[dict]) -> bool:
    for slot in slots:
        if block_solver.slot_is_available(slot, task_a, reserved_windows) and block_solver.slot_is_available(
            slot, task_b, reserved_windows
        ):
            return True
    return False


def find_joint_pairs(tasks: list[dict], slots: list[dict], reserved_windows: list[dict] | None = None) -> list[tuple[str, str]]:
    reserved_windows = reserved_windows or []
    pairs = []
    for i, task_a in enumerate(tasks):
        for task_b in tasks[i + 1 :]:
            if task_a["department_owner"] == task_b["department_owner"]:
                continue
            chainage_a = _chainage_for_task(task_a)
            chainage_b = _chainage_for_task(task_b)
            if chainage_a is None or chainage_b is None or abs(chainage_a - chainage_b) > 1e-6:
                continue
            if not _windows_overlap(task_a, task_b):
                continue
            if not _has_combinable_slot(task_a, task_b, slots, reserved_windows):
                continue
            pairs.append((task_a["defect_id"], task_b["defect_id"]))
    return pairs


def solve_with_joint_preference(
    tasks: list[dict],
    slots: list[dict],
    reserved_windows: list[dict] | None = None,
    precedence: list[tuple[str, str]] | None = None,
    max_concurrent_per_department: int = block_solver.DEFAULT_MAX_CONCURRENT_PER_DEPARTMENT,
    safety_buffer_minutes: float = block_solver.DEFAULT_SAFETY_BUFFER_MINUTES,
    horizon: str = "weekly",
    time_budget_seconds: float = 10.0,
) -> dict:
    reserved_windows = reserved_windows or []
    joint_pairs = find_joint_pairs(tasks, slots, reserved_windows)

    per_pass_budget = time_budget_seconds / 2.0 if joint_pairs else time_budget_seconds

    if joint_pairs:
        combined_result = block_solver.solve(
            tasks,
            slots,
            reserved_windows=reserved_windows,
            precedence=precedence,
            max_concurrent_per_department=max_concurrent_per_department,
            safety_buffer_minutes=safety_buffer_minutes,
            forced_pairs=joint_pairs,
            horizon=horizon,
            time_budget_seconds=per_pass_budget,
        )
        if combined_result["status"] == "OK":
            combined_result["joint_pairs_forced"] = joint_pairs
            combined_result["joint_pass"] = "combined"
            return combined_result

    fallback_result = block_solver.solve(
        tasks,
        slots,
        reserved_windows=reserved_windows,
        precedence=precedence,
        max_concurrent_per_department=max_concurrent_per_department,
        safety_buffer_minutes=safety_buffer_minutes,
        forced_pairs=None,
        horizon=horizon,
        time_budget_seconds=per_pass_budget,
    )
    fallback_result["joint_pairs_forced"] = []
    fallback_result["joint_pass"] = "separate"
    return fallback_result
