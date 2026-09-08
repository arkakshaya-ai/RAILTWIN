from __future__ import annotations

from services.failure_prediction.escalation_model import escalation_risk_for_defect, score_defects


def _reading(temperature_c: float, threshold_breach: bool, ts: str) -> dict:
    return {
        "sensor_id": "HBX-SEC-A-00",
        "section": "SEC-A",
        "chainage_km": 10.0,
        "timestamp": ts,
        "attributes": {"temperature_c": temperature_c, "threshold_breach": threshold_breach},
    }


STRESSED_READINGS = [
    _reading(55.0, False, "2026-09-01T00:00:00Z"),
    _reading(62.0, True, "2026-09-03T00:00:00Z"),
    _reading(68.0, True, "2026-09-05T00:00:00Z"),
    _reading(74.0, True, "2026-09-07T00:00:00Z"),
]

CALM_READINGS = [
    _reading(40.0, False, "2026-09-01T00:00:00Z"),
    _reading(40.5, False, "2026-09-03T00:00:00Z"),
    _reading(41.0, False, "2026-09-05T00:00:00Z"),
    _reading(40.8, False, "2026-09-07T00:00:00Z"),
]


class TestEscalationRiskModel:
    def test_stressed_sensor_trend_scores_higher_than_calm(self):
        stressed_risk = escalation_risk_for_defect(STRESSED_READINGS, days_since_inspection=45.0)
        calm_risk = escalation_risk_for_defect(CALM_READINGS, days_since_inspection=45.0)

        assert stressed_risk > calm_risk

    def test_no_history_does_not_crash(self):
        risk = escalation_risk_for_defect([])
        assert risk >= 0.0

    def test_score_defects_batch(self):
        defects = [
            {"defect_id": "DEF-101", "asset_id": "AST-STRESSED"},
            {"defect_id": "DEF-102", "asset_id": "AST-CALM"},
        ]
        history = {"AST-STRESSED": STRESSED_READINGS, "AST-CALM": CALM_READINGS}

        results = {r["defect_id"]: r["escalation_risk"] for r in score_defects(defects, history)}

        assert results["DEF-101"] > results["DEF-102"]
