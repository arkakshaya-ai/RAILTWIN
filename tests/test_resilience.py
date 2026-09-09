"""Phase 6 acceptance tests: per-service heartbeats, fast/deep fallback,
weather as a real speed-restriction constraint, and joint emergency
re-optimization. Mirrors tests/test_planning_api.py's TestClient +
in-memory-sqlite pattern (no live Kafka/Postgres in this sandbox).
"""
from __future__ import annotations

import time

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool

from services.conflict_prediction.fast_tier import predict_conflicts
from services.digital_twin.weather_store import WeatherStore
from services.ingestion.udm_writer import metadata
from services.planning_api import health as health_module
from services.planning_api.deps import get_engine
from services.planning_api.main import app
from services.traffic_optimizer import safety_validation


@pytest.fixture()
def sqlite_engine():
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


class TestPerServiceHeartbeats:
    """Task 6.1."""

    def test_one_service_failure_is_isolated_and_reported_within_one_check(self, client, monkeypatch):
        def _raise(*args, **kwargs):
            raise RuntimeError("conflict prediction engine unavailable")

        monkeypatch.setattr(
            "services.conflict_prediction.fast_tier.predict_conflicts", _raise
        )

        # A single explicit self-check call, not the 30s scheduler interval.
        ok = health_module.run_self_check()
        assert ok is False

        response = client.get("/api/v1/health")
        assert response.status_code == 200
        body = response.json()

        assert body["ai_engine"] == "down"
        services = body["services"]
        assert services["conflict_prediction"]["status"] == "down"
        assert services["priority_scoring"]["status"] == "up"
        assert services["failure_prediction"]["status"] == "up"
        for entry in services.values():
            assert isinstance(entry["latency_ms"], (int, float))
            assert entry["last_heartbeat"]

        # Section 7 NFR: an AI-engine outage must not block core monitoring.
        network_response = client.get("/api/v1/network/state")
        assert network_response.status_code == 200

    def test_all_services_up_when_nothing_is_broken(self, client):
        ok = health_module.run_self_check()
        assert ok is True

        body = client.get("/api/v1/health").json()
        assert body["ai_engine"] == "up"
        assert set(body["services"].keys()) == {
            "conflict_prediction",
            "priority_scoring",
            "failure_prediction",
        }
        assert all(entry["status"] == "up" for entry in body["services"].values())


class TestFastTierFallback:
    """Task 6.2."""

    def test_fallback_option_appended_when_deep_optimizer_returns_empty_fail_safe(self, client, monkeypatch):
        conflicts = client.get("/api/v1/conflicts").json()["conflicts"]
        assert len(conflicts) >= 1
        conflict_id = conflicts[0]["id"]

        def _fake_resolve_conflict(*args, **kwargs):
            return {"options": [], "rejected": [], "proven_optimal": False, "fail_safe": True}

        monkeypatch.setattr(
            "services.planning_api.routers.conflicts.resolve_conflict", _fake_resolve_conflict
        )

        response = client.get(f"/api/v1/conflicts/{conflict_id}/options")
        assert response.status_code == 200
        body = response.json()

        assert body["fail_safe"] is True
        assert body["rejected"] == []
        assert len(body["options"]) >= 1
        fallback = body["options"][0]
        assert fallback["action"] == "hold"
        assert "fast_tier_fallback" in fallback["constraints_checked"]
        assert "train_held" in fallback

    def test_deep_optimizer_success_path_is_untouched(self, client):
        conflicts = client.get("/api/v1/conflicts").json()["conflicts"]
        conflict_id = conflicts[0]["id"]

        response = client.get(f"/api/v1/conflicts/{conflict_id}/options")
        body = response.json()
        assert body["fail_safe"] is False
        assert all("fast_tier_fallback" not in o["constraints_checked"] for o in body["options"])


class TestWeatherAsRealConstraint:
    """Task 6.3."""

    def test_predict_conflicts_lengthens_eta_under_a_severe_speed_restriction(self):
        # Head-on scripted so, at full speed, they meet in 15 minutes:
        # closing speed 120 km/h, 30 km apart -> 30/120*60 = 15 min.
        train_a = {
            "train_id": "TRN-901", "section": "SEC-A", "chainage_km": 5.0,
            "speed_kmph": 60.0, "direction": "UP", "timestamp": "2026-09-08T06:00:00+00:00",
        }
        train_b = {
            "train_id": "TRN-902", "section": "SEC-A", "chainage_km": 35.0,
            "speed_kmph": 60.0, "direction": "DOWN", "timestamp": "2026-09-08T06:00:00+00:00",
        }
        network_state = {
            "SEC-A": {"section": "SEC-A", "trains": [train_a, train_b], "axle_sensors": [], "hotbox_sensors": []},
        }

        baseline = predict_conflicts(network_state, lookahead_minutes=120.0)
        assert len(baseline) == 1
        baseline_eta = baseline[0]["eta_minutes"]
        assert abs(baseline_eta - 15.0) < 0.5

        weather = WeatherStore()
        weather.update(
            {"section": "SEC-A", "condition": "fog", "severity": 4, "speed_restriction_kmph": 30.0,
             "timestamp": "2026-09-08T06:00:00+00:00"}
        )
        restricted = predict_conflicts(
            network_state, lookahead_minutes=120.0, weather_lookup=weather.effective_speed_restriction_kmph
        )
        assert len(restricted) == 1
        restricted_eta = restricted[0]["eta_minutes"]

        # Capped closing speed 30+30=60 km/h halves the closing speed ->
        # doubles the ETA. Measurably lower effective restriction, not just
        # a display value: it actually changes the predicted timing.
        assert restricted_eta > baseline_eta
        assert abs(restricted_eta - 30.0) < 0.5

    def test_check_speed_restriction_rejects_above_and_accepts_at_or_below(self):
        assert safety_validation.check_speed_restriction({"implied_speed_kmph": 70.0}, 40.0) is False
        assert safety_validation.check_speed_restriction({"implied_speed_kmph": 30.0}, 40.0) is True

    def test_conflict_options_use_weather_restriction_over_flat_default_when_no_override_given(self, client):
        # SEC-B is the demo digital-twin's seeded conflict section, and
        # demo_data.py seeds heavy fog (40 km/h) there too (Task 6.3), so
        # this exercises the real end-to-end wiring with no manual setup.
        conflicts = client.get("/api/v1/conflicts").json()["conflicts"]
        sec_b_conflict = next(c for c in conflicts if c["section"] == "SEC-B")
        conflict_id = sec_b_conflict["id"]

        # Explicit override bypasses weather entirely: at the flat default
        # (100 km/h) every candidate's implied speed (<=70) is compliant.
        unrestricted = client.get(
            f"/api/v1/conflicts/{conflict_id}/options", params={"speed_restriction_kmph": 100.0}
        ).json()
        unrestricted_actions = {o["action"] for o in unrestricted["options"]}
        assert "resequence" in unrestricted_actions or "hold" in unrestricted_actions

        # No override -> falls back to the section's weather-effective
        # restriction (40 km/h), which hard-rejects the 70 km/h main-line
        # candidates but still accepts the 30 km/h loop-line reroute.
        weather_restricted = client.get(f"/api/v1/conflicts/{conflict_id}/options").json()
        restricted_actions = {o["action"] for o in weather_restricted["options"]}
        assert "resequence" not in restricted_actions
        assert "hold" not in restricted_actions
        assert "reroute" in restricted_actions

        rejected_actions = {r["action"] for r in weather_restricted["rejected"]}
        assert rejected_actions & {"resequence", "hold"}
        for rejected in weather_restricted["rejected"]:
            if rejected["action"] in ("resequence", "hold"):
                assert "speed_restriction" in rejected["rejected_gates"]


class TestJointEmergencyReoptimization:
    """Task 6.4."""

    def test_emergency_trigger_touches_both_engines_within_budget(self, client):
        started = time.monotonic()
        response = client.post(
            "/api/v1/emergency/trigger",
            json={"section": "SEC-B", "reason": "signal failure"},
        )
        elapsed = time.monotonic() - started

        assert response.status_code == 200
        body = response.json()

        assert body["status"] == "triggered"
        assert body["reoptimization_id"]

        assert body["traffic_result"] is not None
        assert body["traffic_result"]["conflicts_handled"] >= 1
        assert len(body["traffic_result"]["options"]) >= 1

        assert body["block_result"] is not None
        assert body["block_result"]["tasks_considered"] >= 1
        assert len(body["block_result"]["plans"]) >= 1

        # Bounded by the shared 10s emergency budget plus each half's fixed
        # anytime overhead (see services/common/anytime.py), with headroom
        # for real (fast, small-model) solve time.
        assert elapsed < 10.0

    def test_emergency_trigger_stub_contract_fields_still_present(self, client):
        response = client.post("/api/v1/emergency/trigger", json={"reason": "unspecified"})
        body = response.json()
        assert body["status"] == "triggered"
        assert body["reoptimization_id"]
