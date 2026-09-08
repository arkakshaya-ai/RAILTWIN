from __future__ import annotations

import time

import pytest

from services.traffic_optimizer import safety_validation, solver
from services.traffic_optimizer.anytime_wrapper import resolve_conflict


def _train(train_id, chainage_km, speed_kmph, priority_class="passenger", crew_duty_minutes=60.0, direction="UP"):
    return {
        "train_id": train_id,
        "section": "SEC-B",
        "chainage_km": chainage_km,
        "speed_kmph": speed_kmph,
        "direction": direction,
        "timestamp": "2026-09-08T10:00:00+00:00",
        "priority_class": priority_class,
        "crew_duty_minutes": crew_duty_minutes,
    }


def _converging_conflict():
    return {
        "section": "SEC-B",
        "trains": [
            _train("TRN-001", chainage_km=64.0, speed_kmph=70.0, priority_class="express"),
            _train("TRN-002", chainage_km=68.0, speed_kmph=65.0, priority_class="freight"),
        ],
    }


class TestSolverCandidateGeneration:
    def test_produces_at_least_two_candidates(self):
        result = solver.solve(_converging_conflict())
        assert len(result["candidates"]) >= 2
        actions = {c["action"] for c in result["candidates"]}
        assert "resequence" in actions
        assert "hold" in actions

    def test_candidates_are_ranked_by_score_descending(self):
        result = solver.solve(_converging_conflict())
        scores = [c["score"] for c in result["candidates"]]
        assert scores == sorted(scores, reverse=True)

    def test_reroute_candidate_appears_when_alternate_route_exists(self):
        result = solver.solve(_converging_conflict())
        actions = {c["action"] for c in result["candidates"]}
        assert "reroute" in actions

    def test_requires_at_least_two_trains(self):
        with pytest.raises(ValueError):
            solver.solve({"section": "SEC-B", "trains": [_train("TRN-001", 64.0, 70.0)]})


class TestSafetyValidationHardFilter:
    def test_speed_restriction_hard_rejects_noncompliant_candidate_but_keeps_compliant_one(self):
        conflict = _converging_conflict()
        compliant = {
            "action": "hold",
            "score": 0.9,
            "resolved_start_min": {"TRN-001": 0.0, "TRN-002": 10.0},
            "eta_min": {"TRN-001": 0.0, "TRN-002": 2.0},
            "implied_speed_kmph": 60.0,
            "crew_duty_minutes": {"TRN-001": 60.0, "TRN-002": 60.0},
            "rerouted_train": None,
        }
        noncompliant = {
            "action": "resequence",
            "score": 0.95,
            "resolved_start_min": {"TRN-001": 0.0, "TRN-002": 10.0},
            "eta_min": {"TRN-001": 0.0, "TRN-002": 2.0},
            "implied_speed_kmph": 120.0,
            "crew_duty_minutes": {"TRN-001": 60.0, "TRN-002": 60.0},
            "rerouted_train": None,
        }

        result = safety_validation.filter_candidates(
            [compliant, noncompliant], conflict, speed_restriction_kmph=80.0, min_headway_minutes=5.0
        )

        surviving_actions = [c["action"] for c in result["options"]]
        assert "resequence" not in surviving_actions
        assert "hold" in surviving_actions

        rejected_actions = [c["action"] for c in result["rejected"]]
        assert "resequence" in rejected_actions
        rejected_entry = next(c for c in result["rejected"] if c["action"] == "resequence")
        assert "speed_restriction" in rejected_entry["rejected_gates"]

    def test_surviving_candidate_is_annotated_with_constraints_checked(self):
        conflict = _converging_conflict()
        candidate = {
            "action": "hold",
            "score": 0.9,
            "resolved_start_min": {"TRN-001": 0.0, "TRN-002": 10.0},
            "eta_min": {"TRN-001": 0.0, "TRN-002": 2.0},
            "implied_speed_kmph": 60.0,
            "crew_duty_minutes": {"TRN-001": 60.0, "TRN-002": 60.0},
            "rerouted_train": None,
        }
        result = safety_validation.filter_candidates([candidate], conflict, speed_restriction_kmph=80.0)
        assert result["options"][0]["constraints_checked"] == list(safety_validation.GATE_NAMES)

    def test_hoer_duty_rest_hard_rejects_overworked_crew(self):
        conflict = _converging_conflict()
        candidate = {
            "action": "hold",
            "score": 0.9,
            "resolved_start_min": {"TRN-001": 0.0, "TRN-002": 500.0},
            "eta_min": {"TRN-001": 0.0, "TRN-002": 2.0},
            "implied_speed_kmph": 60.0,
            "crew_duty_minutes": {"TRN-001": 60.0, "TRN-002": 450.0},
            "rerouted_train": None,
        }
        result = safety_validation.filter_candidates([candidate], conflict, speed_restriction_kmph=100.0)
        assert result["options"] == []
        assert "hoer_duty_rest" in result["rejected"][0]["rejected_gates"]

    def test_loco_route_compat_hard_rejects_freight_reroute_onto_loop(self):
        conflict = {
            "section": "SEC-B",
            "trains": [
                _train("TRN-001", 64.0, 70.0, priority_class="express"),
                _train("TRN-002", 68.0, 65.0, priority_class="freight"),
            ],
        }
        reroute_candidate = {
            "action": "reroute",
            "score": 0.9,
            "resolved_start_min": {"TRN-001": 0.0, "TRN-002": 20.0},
            "eta_min": {"TRN-001": 0.0, "TRN-002": 2.0},
            "implied_speed_kmph": 30.0,
            "crew_duty_minutes": {"TRN-001": 60.0, "TRN-002": 60.0},
            "rerouted_train": "TRN-002",
        }
        result = safety_validation.filter_candidates([reroute_candidate], conflict, speed_restriction_kmph=100.0)
        assert result["options"] == []
        assert "loco_route_compat" in result["rejected"][0]["rejected_gates"]

    def test_route_locking_hard_rejects_two_trains_sharing_chainage_within_headway(self):
        conflict = _converging_conflict()
        candidate = {
            "action": "hold",
            "score": 0.9,
            "resolved_start_min": {"TRN-001": 0.0, "TRN-002": 1.0},
            "eta_min": {"TRN-001": 0.0, "TRN-002": 2.0},
            "implied_speed_kmph": 60.0,
            "crew_duty_minutes": {"TRN-001": 60.0, "TRN-002": 60.0},
            "rerouted_train": None,
        }
        result = safety_validation.filter_candidates(
            [candidate], conflict, speed_restriction_kmph=100.0, min_headway_minutes=5.0
        )
        assert result["options"] == []
        assert "route_locking_compatibility" in result["rejected"][0]["rejected_gates"]


class TestAnytimeWrapper:
    def test_resolve_conflict_end_to_end_returns_options_shape(self):
        result = resolve_conflict(_converging_conflict(), time_budget_seconds=5.0)
        assert result["fail_safe"] is False
        assert len(result["options"]) >= 1
        for option in result["options"]:
            assert set(["action", "score", "rationale", "constraints_checked"]).issubset(option.keys())

    def test_tiny_time_budget_returns_fail_safe_without_hanging_or_raising(self):
        started = time.monotonic()
        result = resolve_conflict(_converging_conflict(), time_budget_seconds=0.001)
        elapsed = time.monotonic() - started

        assert elapsed < 2.0
        assert result["fail_safe"] is True
        assert "options" in result
