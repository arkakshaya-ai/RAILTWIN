"""Naive/greedy baseline block-assignment simulator (Task 7.1).

Mirrors `block_optimizer.solver.solve()`'s call signature and output shape
(`{"plans": [...], "unassigned_task_ids": [...]}`, plans shaped exactly like
`block_plan` rows) so evaluation code (`services/evaluation/metrics.py`) can
run both planners over identical input and compare them without special-
casing either one.

Tasks are processed strictly first-come-first-served by `reported_date`
rather than severity-desc, because that is literally how a paper/spreadsheet
block-possession register works in the field: work orders are actioned in
the order they were logged, not re-ranked by a model a manual process has no
access to -- that contrast (FIFO ticket queue vs. urgency-weighted CP-SAT
objective) is the whole point of comparing this against `plan_tasks()`. Ties
(every seeded demo defect shares the same `reported_date`, since
`seed_demo_defects()` stamps all of them with the same generation `now`) are
broken by a *stable* sort that preserves each task's original position in
the input list rather than by `defect_id` -- `defect_id` is a fresh random
uuid4 minted on every `build_defect_message()` call (not seeded), so tie-
breaking on it would make this "deterministic" simulator's output change
between two calls with the same seed, while the input list's order itself
is fully reproducible for a fixed seed (only the id string varies).

Each task claims the first COA-available slot in chronological order and
takes it off the table for every later task -- one task per slot, no joint-
block combination, no department-capacity balancing, no precedence-
awareness. `slot_is_available()` (the real COA-window/reserved-window check
`solver.py` itself uses) is reused as-is so "naive" only means "no
optimization", never "ignores real-world constraints".
"""
from __future__ import annotations

from typing import Optional

from services.block_optimizer.solver import slot_is_available


def baseline_assign(
    tasks: list[dict],
    slots: list[dict],
    reserved_windows: Optional[list[dict]] = None,
    horizon: str = "weekly",
) -> dict:
    reserved_windows = reserved_windows or []

    ordered_tasks = sorted(tasks, key=lambda t: t["reported_date"])
    # ISO-8601 window_start strings sort chronologically as plain text (see
    # demo_data.py's note that slots are always naive/consistently
    # formatted), so no datetime parsing is needed just to order them.
    ordered_slots = sorted(slots, key=lambda s: (s["window_start"], s["slot_id"]))

    used_slot_ids: set[str] = set()
    plans: list[dict] = []
    unassigned_task_ids: list[str] = []

    for task in ordered_tasks:
        chosen_slot = next(
            (
                slot
                for slot in ordered_slots
                if slot["slot_id"] not in used_slot_ids and slot_is_available(slot, task, reserved_windows)
            ),
            None,
        )
        if chosen_slot is None:
            unassigned_task_ids.append(task["defect_id"])
            continue

        used_slot_ids.add(chosen_slot["slot_id"])
        plans.append(
            {
                "plan_id": f"PLAN-{chosen_slot['slot_id']}",
                "horizon": horizon,
                "slot_id": chosen_slot["slot_id"],
                "departments": [task["department_owner"]],
                "task_ids": [task["defect_id"]],
            }
        )

    plans.sort(key=lambda p: p["slot_id"])
    return {
        "plans": plans,
        "unassigned_task_ids": unassigned_task_ids,
        "proven_optimal": False,
        "status": "OK",
    }
