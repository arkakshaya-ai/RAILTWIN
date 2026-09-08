from __future__ import annotations

import time

from services.block_optimizer import joint_block_logic, solver
from services.block_optimizer.anytime_wrapper import plan_tasks
from services.producers.reference_data import ASSETS

_ASSET = ASSETS[0]
_SECTION = _ASSET["section"]


def _task(defect_id, department_owner, severity=3, priority_score=5.0, asset_id=None):
    return {
        "defect_id": defect_id,
        "asset_id": asset_id or _ASSET["asset_id"],
        "source_system": "TMS" if department_owner == "Engineering" else "SMMS",
        "category": "rail_crack" if department_owner == "Engineering" else "signal_fault",
        "severity": severity,
        "reported_date": "2026-09-01",
        "due_date": "2026-09-20",
        "department_owner": department_owner,
        "priority_score": priority_score,
        "escalation_risk": 0.3,
    }


def _slot(slot_id, window_start, window_end, block_type="line", section=_SECTION):
    return {
        "slot_id": slot_id,
        "section": section,
        "window_start": window_start,
        "window_end": window_end,
        "block_type": block_type,
        "traffic_density": 0.1,
    }


class TestSolverConstraints:
    def test_task_only_assigned_within_coa_window(self):
        tasks = [_task("DFX-1", "Engineering")]
        early_slot = _slot("SLOT-EARLY", "2026-08-01T01:00:00", "2026-08-01T04:00:00")
        valid_slot = _slot("SLOT-OK", "2026-09-10T01:00:00", "2026-09-10T04:00:00")
        result = solver.solve(tasks, [early_slot, valid_slot], time_budget_seconds=5.0)
        assert result["status"] == "OK"
        assert result["plans"][0]["slot_id"] == "SLOT-OK"

    def test_traffic_type_slot_never_used_for_maintenance(self):
        tasks = [_task("DFX-1", "Engineering")]
        traffic_slot = _slot("SLOT-TRAFFIC", "2026-09-10T01:00:00", "2026-09-10T04:00:00", block_type="traffic")
        result = solver.solve(tasks, [traffic_slot], time_budget_seconds=5.0)
        assert result["status"] == "INFEASIBLE"

    def test_reserved_timetable_window_excludes_overlapping_slot(self):
        tasks = [_task("DFX-1", "Engineering")]
        overlapping_slot = _slot("SLOT-1", "2026-09-10T01:00:00", "2026-09-10T04:00:00")
        clear_slot = _slot("SLOT-2", "2026-09-11T01:00:00", "2026-09-11T04:00:00")
        reserved = [{"section": _SECTION, "window_start": "2026-09-10T00:00:00", "window_end": "2026-09-10T05:00:00"}]
        result = solver.solve(tasks, [overlapping_slot, clear_slot], reserved_windows=reserved, time_budget_seconds=5.0)
        assert result["plans"][0]["slot_id"] == "SLOT-2"

    def test_crew_capacity_caps_concurrent_same_department_tasks_per_slot(self):
        tasks = [_task("DFX-1", "Engineering"), _task("DFX-2", "Engineering"), _task("DFX-3", "Engineering")]
        one_slot = [_slot("SLOT-1", "2026-09-10T01:00:00", "2026-09-10T04:00:00")]
        result = solver.solve(tasks, one_slot, max_concurrent_per_department=2, time_budget_seconds=5.0)
        assert result["status"] == "INFEASIBLE"

    def test_precedence_forces_before_task_into_earlier_slot(self):
        tasks = [_task("DFX-1", "Engineering"), _task("DFX-2", "Engineering")]
        slot_a = _slot("SLOT-A", "2026-09-10T01:00:00", "2026-09-10T04:00:00")
        slot_b = _slot("SLOT-B", "2026-09-12T01:00:00", "2026-09-12T04:00:00")
        result = solver.solve(
            tasks, [slot_a, slot_b], precedence=[("DFX-1", "DFX-2")], time_budget_seconds=5.0
        )
        plan_by_task = {tid: p["slot_id"] for p in result["plans"] for tid in p["task_ids"]}
        assert plan_by_task["DFX-1"] == "SLOT-A"
        assert plan_by_task["DFX-2"] == "SLOT-B"

    def test_safety_buffer_forbids_two_close_adjacent_blocks_on_same_section(self):
        tasks = [_task("DFX-1", "Engineering"), _task("DFX-2", "S&T")]
        close_a = _slot("SLOT-A", "2026-09-10T01:00:00", "2026-09-10T02:00:00")
        close_b = _slot("SLOT-B", "2026-09-10T02:10:00", "2026-09-10T04:00:00")
        result = solver.solve(
            tasks, [close_a, close_b], safety_buffer_minutes=30, time_budget_seconds=5.0
        )
        used_slots = {p["slot_id"] for p in result["plans"]}
        assert len(used_slots) == 1


class TestJointBlockCombination:
    def test_same_chainage_cross_department_tasks_combine_into_one_slot(self):
        eng_task = _task("DFX-ENG", "Engineering")
        st_task = _task("DFX-ST", "S&T")
        slot = _slot("SLOT-SHARED", "2026-09-10T01:00:00", "2026-09-10T04:00:00")
        result = joint_block_logic.solve_with_joint_preference([eng_task, st_task], [slot], time_budget_seconds=5.0)

        assert result["status"] == "OK"
        assert len(result["plans"]) == 1
        plan = result["plans"][0]
        assert set(plan["task_ids"]) == {"DFX-ENG", "DFX-ST"}
        assert set(plan["departments"]) == {"Engineering", "S&T"}
        assert result["joint_pass"] == "combined"

    def test_different_chainage_tasks_are_not_forced_together(self):
        other_asset = ASSETS[1]
        eng_task = _task("DFX-ENG", "Engineering", asset_id=_ASSET["asset_id"])
        st_task = _task("DFX-ST", "S&T", asset_id=other_asset["asset_id"])
        pairs = joint_block_logic.find_joint_pairs([eng_task, st_task], [_slot("SLOT-1", "2026-09-10T01:00:00", "2026-09-10T04:00:00")])
        assert pairs == []


class TestAnytimeWrapper:
    def test_plan_tasks_end_to_end_returns_block_plan_shape(self):
        tasks = [_task("DFX-1", "Engineering")]
        slot = _slot("SLOT-1", "2026-09-10T01:00:00", "2026-09-10T04:00:00")
        result = plan_tasks(tasks, [slot], time_budget_seconds=5.0)
        assert result["fail_safe"] is False
        plan = result["plans"][0]
        assert set(["plan_id", "horizon", "slot_id", "departments", "task_ids"]).issubset(plan.keys())

    def test_tiny_time_budget_returns_fail_safe_without_hanging_or_raising(self):
        tasks = [_task(f"DFX-{i}", "Engineering" if i % 2 == 0 else "S&T", asset_id=ASSETS[i % len(ASSETS)]["asset_id"]) for i in range(8)]
        slots = [
            _slot(f"SLOT-{i}", f"2026-09-{10+i:02d}T01:00:00", f"2026-09-{10+i:02d}T04:00:00", section=ASSETS[i % len(ASSETS)]["section"])
            for i in range(8)
        ]

        started = time.monotonic()
        result = plan_tasks(tasks, slots, time_budget_seconds=0.001)
        elapsed = time.monotonic() - started

        assert elapsed < 2.0
        assert result["fail_safe"] is True
