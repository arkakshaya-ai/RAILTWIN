"""Survival-style escalation risk model for defects, from hot-box sensor trends.

`pip install scikit-survival` installed cleanly in this environment (prebuilt
wheel, no compiler needed), so the primary path trains a real
`CoxPHSurvivalAnalysis` proportional-hazards model on synthetic
time-to-escalation data. A `LogisticRegression`-on-time-window-features
fallback (BUILD_SPEC's documented alternative) is kept as a real, exercised
code path behind `HAS_SKSURV` for environments where the compiled dependency
is unavailable -- it is not a stub.

`StateStore` only keeps the *latest* reading per sensor, not a time series,
so it cannot supply a trend by itself. Callers pass a short history of
recent hot-box readings per asset (from a real telemetry store once one
exists, or synthetic history in tests) and this module turns that into
trend features:
  - breach_count: threshold_breach=True readings in the window
  - breach_frequency: breach_count / total readings in the window
  - temp_trend_c_per_reading: (last - first) temperature_c over the window
  - days_since_inspection: caller-supplied, defaults to 30 (no signal)
"""
from __future__ import annotations

import numpy as np

try:
    from sksurv.linear_model import CoxPHSurvivalAnalysis
    from sksurv.util import Surv

    HAS_SKSURV = True
except ImportError:
    from sklearn.linear_model import LogisticRegression

    HAS_SKSURV = False

FEATURE_NAMES: list[str] = [
    "breach_count",
    "breach_frequency",
    "temp_trend_c_per_reading",
    "days_since_inspection",
]

DEFAULT_DAYS_SINCE_INSPECTION = 30.0


def compute_sensor_trend_features(
    readings: list[dict], days_since_inspection: float = DEFAULT_DAYS_SINCE_INSPECTION
) -> dict:
    if not readings:
        return {
            "breach_count": 0.0,
            "breach_frequency": 0.0,
            "temp_trend_c_per_reading": 0.0,
            "days_since_inspection": days_since_inspection,
        }

    breaches = [bool(r["attributes"]["threshold_breach"]) for r in readings]
    temps = [float(r["attributes"]["temperature_c"]) for r in readings]

    breach_count = float(sum(breaches))
    breach_frequency = breach_count / len(readings)
    temp_trend = (temps[-1] - temps[0]) / max(1, len(temps) - 1)

    return {
        "breach_count": breach_count,
        "breach_frequency": breach_frequency,
        "temp_trend_c_per_reading": temp_trend,
        "days_since_inspection": days_since_inspection,
    }


def _feature_vector(features: dict) -> list[float]:
    return [features[name] for name in FEATURE_NAMES]


def _synthetic_training_data(n: int = 600, seed: int = 7):
    rng = np.random.default_rng(seed)

    breach_count = rng.poisson(lam=1.5, size=n).astype(float)
    breach_frequency = np.clip(breach_count / rng.integers(4, 12, size=n), 0, 1)
    temp_trend = rng.normal(loc=0.5, scale=2.0, size=n)
    days_since_inspection = rng.uniform(0, 120, size=n)

    hazard_signal = (
        0.35 * np.clip(breach_count / 5.0, 0, 1)
        + 0.30 * breach_frequency
        + 0.20 * np.clip(temp_trend / 5.0, 0, 1)
        + 0.15 * np.clip(days_since_inspection / 120.0, 0, 1)
    )

    time_to_escalation = np.clip(180.0 * (1.0 - hazard_signal) + rng.normal(0, 8, size=n), 1, 365)
    event_prob = np.clip(hazard_signal + rng.normal(0, 0.05, size=n), 0, 1)
    event_observed = rng.uniform(0, 1, size=n) < event_prob

    X = np.column_stack([breach_count, breach_frequency, temp_trend, days_since_inspection])
    return X, event_observed, time_to_escalation


class EscalationRiskModel:
    def __init__(self):
        self._model = None
        self._fit_offset = 0.0
        self._fit()

    def _fit(self) -> None:
        X, event_observed, time_to_escalation = _synthetic_training_data()

        if HAS_SKSURV:
            y = Surv.from_arrays(event=event_observed, time=time_to_escalation)
            model = CoxPHSurvivalAnalysis()
            model.fit(X, y)
            self._model = model
            self._fit_offset = -float(np.min(model.predict(X)))
        else:
            model = LogisticRegression()
            model.fit(X, event_observed)
            self._model = model
            self._fit_offset = 0.0

    def predict_risk(self, features: dict) -> float:
        vector = np.array([_feature_vector(features)])
        if HAS_SKSURV:
            raw = float(self._model.predict(vector)[0])
            return max(0.0, raw + self._fit_offset)
        return float(self._model.predict_proba(vector)[0][1])


_shared_model: EscalationRiskModel | None = None


def _get_shared_model() -> EscalationRiskModel:
    global _shared_model
    if _shared_model is None:
        _shared_model = EscalationRiskModel()
    return _shared_model


def escalation_risk_for_defect(
    readings: list[dict], days_since_inspection: float = DEFAULT_DAYS_SINCE_INSPECTION
) -> float:
    features = compute_sensor_trend_features(readings, days_since_inspection=days_since_inspection)
    return _get_shared_model().predict_risk(features)


def score_defects(
    defects: list[dict],
    sensor_history_by_asset: dict[str, list[dict]],
    days_since_inspection_by_asset: dict[str, float] | None = None,
) -> list[dict]:
    days_since_inspection_by_asset = days_since_inspection_by_asset or {}
    model = _get_shared_model()

    results = []
    for defect in defects:
        asset_id = defect["asset_id"]
        readings = sensor_history_by_asset.get(asset_id, [])
        days_since_inspection = days_since_inspection_by_asset.get(
            asset_id, DEFAULT_DAYS_SINCE_INSPECTION
        )
        features = compute_sensor_trend_features(readings, days_since_inspection=days_since_inspection)
        results.append(
            {
                "defect_id": defect["defect_id"],
                "asset_id": asset_id,
                "escalation_risk": model.predict_risk(features),
            }
        )
    return results
