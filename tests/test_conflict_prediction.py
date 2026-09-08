from __future__ import annotations

from datetime import datetime, timezone

from services.conflict_prediction.cascading_delay import (
    naive_linear_delay,
    project_delay_to_downstream_division,
    recovery_adjusted_delay,
)
from services.conflict_prediction.fast_tier import predict_conflicts

NOW = datetime(2026, 9, 8, 6, 0, 0, tzinfo=timezone.utc)


def _train(train_id, section, chainage_km, speed_kmph, direction):
    return {
        "train_id": train_id,
        "section": section,
        "chainage_km": chainage_km,
        "speed_kmph": speed_kmph,
        "direction": direction,
        "timestamp": NOW.isoformat(),
    }


class TestFastTierConflictPrediction:
    def test_flags_converging_trains_with_enough_advance_warning(self):
        # Head-on scripted so they meet at exactly 45 minutes:
        # closing speed 40 km/h, 30 km apart -> 30/40*60 = 45 min.
        train_a = _train("TRN-001", "SEC-A", chainage_km=5.0, speed_kmph=20.0, direction="UP")
        train_b = _train("TRN-002", "SEC-A", chainage_km=35.0, speed_kmph=20.0, direction="DOWN")
        network_state = {
            "SEC-A": {"section": "SEC-A", "trains": [train_a, train_b], "axle_sensors": [], "hotbox_sensors": []},
            "SEC-B": {"section": "SEC-B", "trains": [], "axle_sensors": [], "hotbox_sensors": []},
        }

        conflicts = predict_conflicts(network_state, lookahead_minutes=120.0, now=NOW)

        assert len(conflicts) == 1
        conflict = conflicts[0]
        assert conflict["section"] == "SEC-A"
        assert set(conflict["trains_involved"]) == {"TRN-001", "TRN-002"}
        assert {"id", "section", "eta", "severity"} <= conflict.keys()

        eta = datetime.fromisoformat(conflict["eta"])
        minutes_ahead = (eta - NOW).total_seconds() / 60.0

        # Scripted collision is at 45 minutes; the fast tier must fire with
        # at least 30 minutes of lead time, not merely detect it after the fact.
        assert minutes_ahead >= 30.0
        assert abs(minutes_ahead - 45.0) < 0.5

    def test_does_not_flag_diverging_trains(self):
        train_a = _train("TRN-003", "SEC-B", chainage_km=50.0, speed_kmph=90.0, direction="UP")
        train_b = _train("TRN-004", "SEC-B", chainage_km=60.0, speed_kmph=90.0, direction="UP")
        network_state = {
            "SEC-B": {"section": "SEC-B", "trains": [train_a, train_b], "axle_sensors": [], "hotbox_sensors": []},
        }

        conflicts = predict_conflicts(network_state, lookahead_minutes=120.0, now=NOW)

        assert conflicts == []


class TestCascadingDelay:
    def test_recovery_adjusted_delay_beats_naive_projection(self):
        primary_delay = 60.0

        naive = naive_linear_delay(primary_delay)
        adjusted = recovery_adjusted_delay(primary_delay)

        assert adjusted < naive

    def test_no_recovery_for_zero_delay(self):
        assert recovery_adjusted_delay(0.0) == 0.0

    def test_project_delay_to_downstream_division_shape(self):
        result = project_delay_to_downstream_division(45.0, upstream_division="DIV-1", downstream_division="DIV-2")

        assert result["upstream_division"] == "DIV-1"
        assert result["downstream_division"] == "DIV-2"
        assert result["recovery_adjusted_delay_minutes"] < result["naive_projected_delay_minutes"]
        assert result["recovered_minutes"] > 0
