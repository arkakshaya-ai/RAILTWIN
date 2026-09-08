from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.pool import StaticPool

from services.ingestion.udm_writer import metadata, recommendation_log_table
from services.planning_api.deps import get_engine
from services.planning_api.main import app


@pytest.fixture()
def sqlite_engine():
    # StaticPool keeps a single underlying connection alive for the whole
    # engine, which is required for a "sqlite://" in-memory DB to survive
    # across the multiple separate `engine.connect()`/`engine.begin()` calls
    # each request makes -- otherwise every connection sees a fresh, empty
    # in-memory database.
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool, future=True
    )
    metadata.create_all(engine)
    return engine


@pytest.fixture()
def client(sqlite_engine):
    app.dependency_overrides[get_engine] = lambda: sqlite_engine
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


class TestNetworkState:
    def test_network_state_returns_trains_sensors_blocks(self, client):
        response = client.get("/api/v1/network/state")
        assert response.status_code == 200
        body = response.json()
        assert set(["trains", "sensors", "blocks"]).issubset(body.keys())
        # Demo digital-twin seeding (services/planning_api/demo_data.py) runs
        # at app startup so this is never trivially empty in this sandbox.
        assert len(body["trains"]) >= 2
        assert body["blocks"] == []


class TestConflictsFlow:
    def test_conflicts_then_options_chain(self, client):
        conflicts_response = client.get("/api/v1/conflicts")
        assert conflicts_response.status_code == 200
        conflicts = conflicts_response.json()["conflicts"]
        assert len(conflicts) >= 1
        conflict_id = conflicts[0]["id"]

        options_response = client.get(f"/api/v1/conflicts/{conflict_id}/options")
        assert options_response.status_code == 200
        options = options_response.json()["options"]
        assert len(options) >= 1
        for option in options:
            assert set(["action", "score", "rationale", "constraints_checked"]).issubset(option.keys())

    def test_unknown_conflict_id_returns_404(self, client):
        response = client.get("/api/v1/conflicts/CNF-does-not-exist/options")
        assert response.status_code == 404

    def test_resolve_logs_recommendation_with_matching_id(self, client, sqlite_engine):
        conflicts = client.get("/api/v1/conflicts").json()["conflicts"]
        conflict_id = conflicts[0]["id"]
        options = client.get(f"/api/v1/conflicts/{conflict_id}/options").json()["options"]
        chosen_option = options[0]

        response = client.post(
            f"/api/v1/conflicts/{conflict_id}/resolve",
            json={"option": chosen_option, "controller_action": "accepted"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "resolved"
        recommendation_id = body["recommendation_id"]

        with sqlite_engine.connect() as conn:
            row = conn.execute(
                select(recommendation_log_table).where(
                    recommendation_log_table.c.recommendation_id == recommendation_id
                )
            ).mappings().first()
        assert row is not None
        assert row["conflict_id"] == conflict_id
        assert row["controller_action"] == "accepted"


class TestDefects:
    def test_defects_returns_scored_seeded_batch(self, client):
        response = client.get("/api/v1/defects")
        assert response.status_code == 200
        defects = response.json()["defects"]
        assert len(defects) > 0
        for defect in defects:
            assert set(["defect_id", "priority_score", "top_features"]).issubset(defect.keys())
            assert 0.0 <= defect["priority_score"] <= 1.0
            assert len(defect["top_features"]) <= 3


class TestBlockPlan:
    def test_weekly_block_plan(self, client):
        response = client.get("/api/v1/blockplan/weekly")
        assert response.status_code == 200
        body = response.json()
        assert "plan_id" in body
        assert body["source"] in ("db", "fallback_solve")
        assert isinstance(body["slots"], list)

    def test_monthly_block_plan(self, client):
        response = client.get("/api/v1/blockplan/monthly")
        assert response.status_code == 200
        body = response.json()
        assert "plan_id" in body
        assert body["source"] in ("db", "fallback_solve")
        assert isinstance(body["sections"], list)

    def test_weekly_block_plan_reads_persisted_rows_when_present(self, client, sqlite_engine):
        from services.scheduling.jobs import run_weekly_block_plan_job

        run_weekly_block_plan_job(sqlite_engine)

        response = client.get("/api/v1/blockplan/weekly")
        body = response.json()
        assert body["source"] == "db"
        assert len(body["slots"]) > 0


class TestEmergencyTrigger:
    def test_emergency_trigger_returns_contract_stub(self, client):
        response = client.post("/api/v1/emergency/trigger", json={"section": "SEC-B", "reason": "signal failure"})
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "triggered"
        assert body["reoptimization_id"]


class TestHealth:
    def test_health_reports_up_with_recent_heartbeat(self, client):
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        body = response.json()
        assert body["ai_engine"] in ("up", "down")
        assert body["last_heartbeat"] is not None
