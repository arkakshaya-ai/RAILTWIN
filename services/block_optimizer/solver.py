"""CP-SAT task -> slot assignment for maintenance/defect blocks.

Input shapes mirror the fixed schemas directly: `tasks` are `defect_task`
rows (defect_id, asset_id, source_system, category, severity, reported_date,
due_date, department_owner, priority_score, escalation_risk, ...) and
`slots` are `corridor_block_slot` rows (slot_id, section, window_start,
window_end, block_type, traffic_density). Output rows are shaped exactly
like `block_plan` (plan_id, horizon, slot_id, departments, task_ids) so a
thin producer wrapper can push them to `block.plan.v1` untouched.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from ortools.sat.python import cp_model

_UNSOLVED_STATUSES = {cp_model.INFEASIBLE, cp_model.MODEL_INVALID, cp_model.UNKNOWN}

DEFAULT_MAX_CONCURRENT_PER_DEPARTMENT = 2
DEFAULT_SAFETY_BUFFER_MINUTES = 30


def _parse_dt(value) -> datetime:
    if isinstance(value, datetime):
        return value
    text = str(value)
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        return datetime.fromisoformat(text + "T00:00:00")


def _parse_date_only(value) -> datetime:
    dt = _parse_dt(value)
    return dt.replace(hour=0, minute=0, second=0, microsecond=0)


def slot_is_available(slot: dict, task: dict, reserved_windows: list[dict]) -> bool:
    if slot.get("block_type") == "traffic":
        return False

    window_start = _parse_dt(slot["window_start"])
    window_end = _parse_dt(slot["window_end"])

    reported = _parse_date_only(task["reported_date"])
    due = _parse_date_only(task["due_date"])
    if window_start < reported or window_end.date() > due.date():
        return False

    for reserved in reserved_windows:
        if reserved.get("section") not in (None, slot["section"]):
            continue
        r_start = _parse_dt(reserved["window_start"])
        r_end = _parse_dt(reserved["window_end"])
        if window_start < r_end and r_start < window_end:
            return False

    return True


def _forbidden_adjacent_pairs(slots: list[dict], safety_buffer_minutes: float) -> list[tuple[str, str]]:
    by_section: dict[str, list[dict]] = {}
    for slot in slots:
        by_section.setdefault(slot["section"], []).append(slot)

    forbidden = []
    for section_slots in by_section.values():
        ordered = sorted(section_slots, key=lambda s: _parse_dt(s["window_start"]))
        for i, earlier in enumerate(ordered):
            earlier_end = _parse_dt(earlier["window_end"])
            for later in ordered[i + 1 :]:
                later_start = _parse_dt(later["window_start"])
                gap_minutes = (later_start - earlier_end).total_seconds() / 60.0
                if gap_minutes < safety_buffer_minutes:
                    forbidden.append((earlier["slot_id"], later["slot_id"]))
    return forbidden


def solve(
    tasks: list[dict],
    slots: list[dict],
    reserved_windows: Optional[list[dict]] = None,
    precedence: Optional[list[tuple[str, str]]] = None,
    max_concurrent_per_department: int = DEFAULT_MAX_CONCURRENT_PER_DEPARTMENT,
    safety_buffer_minutes: float = DEFAULT_SAFETY_BUFFER_MINUTES,
    forced_pairs: Optional[list[tuple[str, str]]] = None,
    horizon: str = "weekly",
    time_budget_seconds: float = 10.0,
) -> dict:
    reserved_windows = reserved_windows or []
    precedence = precedence or []
    forced_pairs = forced_pairs or []

    if not tasks:
        return {"plans": [], "unassigned_task_ids": [], "proven_optimal": True, "status": "OK"}

    model = cp_model.CpModel()
    slot_by_id = {s["slot_id"]: s for s in slots}

    feasible_slots = {
        task["defect_id"]: [s["slot_id"] for s in slots if slot_is_available(s, task, reserved_windows)]
        for task in tasks
    }

    assign = {}
    for task in tasks:
        tid = task["defect_id"]
        for slot_id in feasible_slots[tid]:
            assign[(tid, slot_id)] = model.NewBoolVar(f"assign_{tid}_{slot_id}")

    unassignable = [t["defect_id"] for t in tasks if not feasible_slots[t["defect_id"]]]
    if unassignable:
        return {
            "plans": [],
            "unassigned_task_ids": unassignable,
            "proven_optimal": False,
            "status": "INFEASIBLE",
            "reason": f"no COA/timetable-compatible slot for tasks: {unassignable}",
        }

    for task in tasks:
        tid = task["defect_id"]
        model.AddExactlyOne(assign[(tid, s)] for s in feasible_slots[tid])

    departments = sorted({t["department_owner"] for t in tasks})
    for slot in slots:
        for dept in departments:
            dept_task_vars = [
                assign[(t["defect_id"], slot["slot_id"])]
                for t in tasks
                if t["department_owner"] == dept and (t["defect_id"], slot["slot_id"]) in assign
            ]
            if dept_task_vars:
                model.Add(sum(dept_task_vars) <= max_concurrent_per_department)

    epoch = min(_parse_dt(s["window_start"]) for s in slots)

    def minutes_since_epoch(dt: datetime) -> int:
        return int((dt - epoch).total_seconds() // 60)

    start_var = {}
    end_var = {}
    for task in tasks:
        tid = task["defect_id"]
        options = feasible_slots[tid]
        max_minute = max(minutes_since_epoch(_parse_dt(slot_by_id[s]["window_end"])) for s in options)
        start_var[tid] = model.NewIntVar(0, max_minute, f"start_{tid}")
        end_var[tid] = model.NewIntVar(0, max_minute, f"end_{tid}")
        model.Add(
            start_var[tid]
            == sum(
                assign[(tid, s)] * minutes_since_epoch(_parse_dt(slot_by_id[s]["window_start"]))
                for s in options
            )
        )
        model.Add(
            end_var[tid]
            == sum(
                assign[(tid, s)] * minutes_since_epoch(_parse_dt(slot_by_id[s]["window_end"]))
                for s in options
            )
        )

    for before_id, after_id in precedence:
        if before_id in start_var and after_id in start_var:
            model.Add(end_var[before_id] <= start_var[after_id])

    slot_used = {}
    for slot in slots:
        users = [
            assign[(t["defect_id"], slot["slot_id"])]
            for t in tasks
            if (t["defect_id"], slot["slot_id"]) in assign
        ]
        if not users:
            continue
        used = model.NewBoolVar(f"used_{slot['slot_id']}")
        model.AddMaxEquality(used, users)
        slot_used[slot["slot_id"]] = used

    for slot_a, slot_b in _forbidden_adjacent_pairs(slots, safety_buffer_minutes):
        if slot_a in slot_used and slot_b in slot_used:
            model.Add(slot_used[slot_a] + slot_used[slot_b] <= 1)

    for task_a, task_b in forced_pairs:
        if task_a not in feasible_slots or task_b not in feasible_slots:
            continue
        common = set(feasible_slots[task_a]) & set(feasible_slots[task_b])
        for slot_id in common:
            model.Add(assign[(task_a, slot_id)] == assign[(task_b, slot_id)])

    # Urgency-weighted earliness: higher-severity/priority defects should be
    # pulled into the earliest legal slot rather than left to whichever slot
    # is left over once lower-severity tasks are packed in.
    urgency_terms = []
    for task in tasks:
        tid = task["defect_id"]
        urgency = float(task.get("priority_score") or task.get("severity", 1))
        urgency_terms.append(int(round(urgency * 10)) * start_var[tid])
    model.Minimize(sum(urgency_terms))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = max(time_budget_seconds, 0.0001)
    solver.parameters.num_workers = 1
    status = solver.Solve(model)

    if status in _UNSOLVED_STATUSES:
        return {
            "plans": [],
            "unassigned_task_ids": [t["defect_id"] for t in tasks],
            "proven_optimal": False,
            "status": "INFEASIBLE",
        }

    grouped: dict[str, list[str]] = {}
    for task in tasks:
        tid = task["defect_id"]
        for slot_id in feasible_slots[tid]:
            if solver.Value(assign[(tid, slot_id)]):
                grouped.setdefault(slot_id, []).append(tid)
                break

    tasks_by_id = {t["defect_id"]: t for t in tasks}
    plans = []
    for slot_id, task_ids in grouped.items():
        plan_departments = sorted({tasks_by_id[tid]["department_owner"] for tid in task_ids})
        plans.append(
            {
                "plan_id": f"PLAN-{slot_id}",
                "horizon": horizon,
                "slot_id": slot_id,
                "departments": plan_departments,
                "task_ids": sorted(task_ids),
            }
        )
    plans.sort(key=lambda p: p["slot_id"])

    return {
        "plans": plans,
        "unassigned_task_ids": [],
        "proven_optimal": status == cp_model.OPTIMAL,
        "status": "OK",
    }
