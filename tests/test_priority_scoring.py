from __future__ import annotations

from datetime import date, timedelta

from services.priority_scoring.score import score_batch

TODAY = date(2026, 9, 8)

SAMPLE_DEFECTS = [
    {
        "defect_id": "DEF-001",
        "asset_id": "AST-SEC-A-TRACK-00",
        "category": "rail_crack",
        "severity": 5,
        "reported_date": TODAY - timedelta(days=40),
        "due_date": TODAY - timedelta(days=20),
        "department_owner": "Engineering",
        "historical_escalation_count": 3,
    },
    {
        "defect_id": "DEF-002",
        "asset_id": "AST-SEC-B-SIGNAL-01",
        "category": "signal_fault",
        "severity": 2,
        "reported_date": TODAY - timedelta(days=5),
        "due_date": TODAY + timedelta(days=10),
        "department_owner": "S&T",
        "historical_escalation_count": 0,
    },
    {
        "defect_id": "DEF-003",
        "asset_id": "AST-SEC-C-OHE-02",
        "category": "ohe_sag",
        "severity": 3,
        "reported_date": TODAY - timedelta(days=15),
        "due_date": TODAY - timedelta(days=1),
        "department_owner": "TRD",
        "historical_escalation_count": 1,
    },
]


class TestScoreBatch:
    def test_scores_in_unit_interval_with_top3_features(self):
        results = score_batch(SAMPLE_DEFECTS, today=TODAY)

        assert len(results) == len(SAMPLE_DEFECTS)
        for defect, result in zip(SAMPLE_DEFECTS, results):
            assert result["defect_id"] == defect["defect_id"]
            assert 0.0 <= result["priority_score"] <= 1.0
            assert len(result["top_features"]) == 3
            for feature in result["top_features"]:
                assert "feature" in feature and "importance" in feature

    def test_empty_batch_returns_empty_list(self):
        assert score_batch([], today=TODAY) == []

    def test_more_severe_overdue_defect_scores_higher(self):
        results = {r["defect_id"]: r["priority_score"] for r in score_batch(SAMPLE_DEFECTS, today=TODAY)}
        assert results["DEF-001"] > results["DEF-002"]
