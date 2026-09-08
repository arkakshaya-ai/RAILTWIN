from __future__ import annotations

from sqlalchemy import create_engine, select
from sqlalchemy.pool import StaticPool

from services.ingestion.udm_writer import block_plan_table, metadata
from services.scheduling.base_timetable import TimetableLeg, build_base_timetable, seed_base_timetable
from services.scheduling.incremental_reopt import find_downstream_dependents, reoptimize_for_disruption
from services.scheduling.jobs import (
    MONTHLY_HORIZON,
    WEEKLY_HORIZON,
    run_monthly_block_plan_job,
    run_weekly_block_plan_job,
)


def _sqlite_engine():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool, future=True
    )
    metadata.create_all(engine)
    return engine


class TestBaseTimetable:
    def test_groups_and_orders_legs_per_train(self):
        entries = [
            {
                "train_id": "TRN-A",
                "section": "SEC-B",
                "scheduled_arrival": "2026-09-10T10:00:00",
                "scheduled_departure": "2026-09-10T10:10:00",
                "priority_class": "express",
            },
            {
                "train_id": "TRN-A",
                "section": "SEC-A",
                "scheduled_arrival": "2026-09-10T09:00:00",
                "scheduled_departure": "2026-09-10T09:10:00",
                "priority_class": "express",
            },
        ]
        timetable = build_base_timetable(entries)
        assert [leg.section for leg in timetable["TRN-A"]] == ["SEC-A", "SEC-B"]

    def test_seed_base_timetable_covers_every_reference_train(self):
        from services.producers.reference_data import TRAIN_IDS

        timetable = seed_base_timetable()
        assert set(timetable.keys()) == set(TRAIN_IDS)


class TestIncrementalReopt:
    def _base_timetable(self):
        return {
            "TRN-A": [TimetableLeg("SEC-A", "2026-09-10T09:00:00", "2026-09-10T09:10:00", "express")],
            "TRN-B": [TimetableLeg("SEC-A", "2026-09-10T10:00:00", "2026-09-10T10:10:00", "freight")],
            "TRN-C": [TimetableLeg("SEC-D", "2026-09-10T09:30:00", "2026-09-10T09:40:00", "passenger")],
        }

    def test_finds_downstream_dependent_sharing_section_after(self):
        timetable = self._base_timetable()
        dependents = find_downstream_dependents(timetable, "TRN-A")
        assert dependents == {"TRN-B"}

    def test_disruption_shifts_disrupted_and_dependent_trains_only(self):
        timetable = self._base_timetable()
        result = reoptimize_for_disruption(timetable, "TRN-A", delay_minutes=20.0)
        new_timetable = result["timetable"]

        assert result["dependent_train_ids"] == ["TRN-B"]

        assert new_timetable["TRN-A"][0].scheduled_arrival != timetable["TRN-A"][0].scheduled_arrival
        assert new_timetable["TRN-B"][0].scheduled_arrival != timetable["TRN-B"][0].scheduled_arrival

        # No path dependency on TRN-A (different section, earlier anyway) ->
        # byte-identical (same object) in the output.
        assert new_timetable["TRN-C"] == timetable["TRN-C"]
        assert new_timetable["TRN-C"] is timetable["TRN-C"]

    def test_dependent_delay_is_recovery_adjusted_not_a_flat_add(self):
        timetable = self._base_timetable()
        result = reoptimize_for_disruption(timetable, "TRN-A", delay_minutes=20.0)
        # recovery_adjusted_delay(20) < 20 (partial recovery), never negative.
        assert 0.0 < result["dependent_delay_minutes"] < 20.0

    def test_unknown_train_raises(self):
        import pytest

        with pytest.raises(KeyError):
            reoptimize_for_disruption(self._base_timetable(), "TRN-NOPE", delay_minutes=5.0)


class TestBlockPlanSchedulerJobs:
    def test_weekly_job_writes_row_with_weekly_horizon(self):
        engine = _sqlite_engine()
        result = run_weekly_block_plan_job(engine)
        assert result["status"] == "OK"
        assert result["written_plan_ids"], "expected at least one persisted plan row"

        with engine.connect() as conn:
            rows = conn.execute(select(block_plan_table)).mappings().all()
        assert rows
        assert all(row["horizon"] == WEEKLY_HORIZON for row in rows)

    def test_monthly_job_writes_row_with_monthly_horizon(self):
        engine = _sqlite_engine()
        result = run_monthly_block_plan_job(engine)
        assert result["status"] == "OK"
        assert result["written_plan_ids"], "expected at least one persisted plan row"

        with engine.connect() as conn:
            rows = conn.execute(select(block_plan_table)).mappings().all()
        assert rows
        assert all(row["horizon"] == MONTHLY_HORIZON for row in rows)

    def test_weekly_and_monthly_jobs_coexist_without_clobbering_each_other(self):
        engine = _sqlite_engine()
        run_weekly_block_plan_job(engine)
        run_monthly_block_plan_job(engine)

        with engine.connect() as conn:
            rows = conn.execute(select(block_plan_table)).mappings().all()
        horizons = {row["horizon"] for row in rows}
        assert horizons == {WEEKLY_HORIZON, MONTHLY_HORIZON}
