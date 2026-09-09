from __future__ import annotations

import time

from services.block_optimizer.solver import slot_is_available
from services.evaluation.baseline_simulator import baseline_assign
from services.evaluation.metrics import compute_evaluation_metrics
from services.planning_api.demo_data import seed_demo_defects, seed_demo_slots


class TestBaselineAssign:
    def test_assigns_only_coa_available_slots(self):
        tasks = seed_demo_defects()
        slots = seed_demo_slots(weeks=5)
        result = baseline_assign(tasks, slots)

        slot_by_id = {s["slot_id"]: s for s in slots}
        task_by_id = {t["defect_id"]: t for t in tasks}
        for plan in result["plans"]:
            slot = slot_by_id[plan["slot_id"]]
            for task_id in plan["task_ids"]:
                assert slot_is_available(slot, task_by_id[task_id], [])

    def test_one_task_per_slot_no_joint_blocking(self):
        tasks = seed_demo_defects()
        slots = seed_demo_slots(weeks=5)
        result = baseline_assign(tasks, slots)

        used_slot_ids = [p["slot_id"] for p in result["plans"]]
        assert len(used_slot_ids) == len(set(used_slot_ids))
        assert all(len(p["task_ids"]) == 1 for p in result["plans"])

    def test_every_task_accounted_for(self):
        tasks = seed_demo_defects()
        slots = seed_demo_slots(weeks=5)
        result = baseline_assign(tasks, slots)

        assigned = {tid for p in result["plans"] for tid in p["task_ids"]}
        all_ids = {t["defect_id"] for t in tasks}
        assert assigned | set(result["unassigned_task_ids"]) == all_ids
        assert assigned.isdisjoint(result["unassigned_task_ids"])

    def test_deterministic_given_the_same_input(self):
        # seed_demo_defects() itself mints a fresh random uuid4 defect_id on
        # every call (see defect_producer.build_defect_message) -- the fixed
        # seed only pins asset/category/severity/date selection, not the id
        # -- so determinism has to be checked at baseline_assign()'s own
        # level: same tasks/slots in, byte-identical plans out.
        tasks = seed_demo_defects(seed=7)
        slots = seed_demo_slots(seed=7, weeks=5)

        result_a = baseline_assign(tasks, slots)
        result_b = baseline_assign(tasks, slots)
        assert result_a["plans"] == result_b["plans"]
        assert result_a["unassigned_task_ids"] == result_b["unassigned_task_ids"]


class TestComputeEvaluationMetrics:
    def test_returns_all_five_metrics_as_real_numbers(self):
        result = compute_evaluation_metrics()

        for section in ("baseline", "ai_optimized"):
            metrics = result[section]
            assert isinstance(metrics["downtime_minutes"], (int, float))
            assert isinstance(metrics["overdue_backlog_burndown_pct"], (int, float))
            assert isinstance(metrics["block_utilization_pct"], (int, float))
            assert isinstance(metrics["joint_block_rate_pct"], (int, float))
            assert isinstance(metrics["priority_score_coverage_pct"], (int, float))

        # Not "0-by-construction-only": the shifted generation anchor
        # (see metrics.py's _OVERDUE_SHIFT_DAYS) must produce a genuine,
        # non-empty overdue subset for the burn-down metric to mean anything.
        assert result["overdue_task_count"] > 0
        assert result["task_count"] == 24
        assert result["ai_optimized"]["downtime_minutes"] > 0
        assert result["baseline"]["downtime_minutes"] > 0

    def test_baseline_never_joint_blocks_by_construction(self):
        result = compute_evaluation_metrics()
        assert result["baseline"]["joint_block_rate_pct"] == 0.0

    def test_ai_joint_block_rate_at_least_baseline(self):
        result = compute_evaluation_metrics()
        assert result["ai_optimized"]["joint_block_rate_pct"] >= result["baseline"]["joint_block_rate_pct"]

    def test_improvement_pct_present_for_all_five_metrics(self):
        result = compute_evaluation_metrics()
        improvement = result["improvement_pct"]
        assert set(improvement.keys()) == {
            "asset_downtime_reduction_pct",
            "overdue_backlog_burndown_pct",
            "block_utilization_efficiency_pct",
            "joint_block_rate_pct",
            "priority_score_coverage_pct",
        }
        assert all(isinstance(v, (int, float)) for v in improvement.values())

    def test_completes_within_generous_latency_bound(self):
        # True NFR concurrent-load verification (Section 7's fast-tier <=2s /
        # deep-optimization <=10-15s anytime targets under real concurrent
        # producer traffic) needs a live `docker compose up` deployment this
        # sandbox does not have. This is only a smoke check that running both
        # solvers back-to-back on the seeded 24-defect/5-week dataset doesn't
        # regress into something pathologically slow.
        start = time.monotonic()
        compute_evaluation_metrics()
        elapsed = time.monotonic() - start
        assert elapsed < 30.0
