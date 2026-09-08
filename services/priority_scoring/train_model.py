"""Trains the defect priority-scoring model on synthetic labeled data.

There is no historical priority-outcome data yet (Phase 2 predates any real
scored backlog), so this generates a synthetic dataset with a known,
documented feature -> label relationship and trains an XGBoost regressor to
recover it. Retraining is a deliberate, explicit step (`train_and_save()`),
not something `score.py` triggers implicitly, so scoring stays fast and
reproducible: `python -m services.priority_scoring.train_model` regenerates
`model.json` + `model_metadata.json` in this directory.

Feature set (see FEATURE_NAMES): severity (1-5 as shipped by defect_task),
days_overdue (0 when not yet due), category_encoded (ordinal index into the
category list for the defect's source system), department_owner_encoded
(Engineering/S&T/TRD -> 0/1/2), historical_escalation_count (prior
escalations recorded for the asset, synthetic here).

Label: a priority outcome in [0, 1] built as a weighted combination of
severity and overdue-ness (the two operational signals maintenance planners
actually triage on) with smaller weights for department/category/history,
plus Gaussian noise, then clipped to [0, 1]. The XGBRegressor is trained
with objective="reg:logistic" so its raw predictions are already sigmoid-
bounded to (0, 1) -- matching the API contract without post-hoc clipping.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import xgboost as xgb

from services.producers.reference_data import DEFECT_CATEGORIES, DEPARTMENT_OWNER

MODEL_PATH = Path(__file__).resolve().parent / "model.json"
METADATA_PATH = Path(__file__).resolve().parent / "model_metadata.json"

ALL_CATEGORIES: list[str] = sorted({c for cats in DEFECT_CATEGORIES.values() for c in cats})
ALL_DEPARTMENTS: list[str] = sorted(set(DEPARTMENT_OWNER.values()))

FEATURE_NAMES: list[str] = [
    "severity",
    "days_overdue",
    "category_encoded",
    "department_owner_encoded",
    "historical_escalation_count",
]


def _synthetic_dataset(n: int = 4000, seed: int = 42) -> tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(seed)

    severity = rng.integers(1, 6, size=n).astype(float)
    days_overdue = np.clip(rng.normal(loc=15, scale=20, size=n), 0, 180)
    category_encoded = rng.integers(0, len(ALL_CATEGORIES), size=n).astype(float)
    department_encoded = rng.integers(0, len(ALL_DEPARTMENTS), size=n).astype(float)
    historical_escalation_count = rng.poisson(lam=1.2, size=n).astype(float)

    severity_norm = (severity - 1) / 4.0
    overdue_norm = np.clip(days_overdue / 90.0, 0, 1)
    history_norm = np.clip(historical_escalation_count / 5.0, 0, 1)

    label = (
        0.45 * severity_norm
        + 0.30 * overdue_norm
        + 0.15 * history_norm
        + 0.10 * rng.uniform(0, 1, size=n)
    )
    label = np.clip(label + rng.normal(0, 0.03, size=n), 0.0, 1.0)

    X = np.column_stack(
        [severity, days_overdue, category_encoded, department_encoded, historical_escalation_count]
    )
    return X, label


def train_and_save(model_path: Path = MODEL_PATH, metadata_path: Path = METADATA_PATH) -> xgb.XGBRegressor:
    X, y = _synthetic_dataset()
    split = int(len(X) * 0.85)
    X_train, y_train = X[:split], y[:split]

    model = xgb.XGBRegressor(
        objective="reg:logistic",
        n_estimators=150,
        max_depth=4,
        learning_rate=0.1,
        subsample=0.9,
        colsample_bytree=0.9,
        random_state=42,
    )
    model.fit(X_train, y_train)

    model.save_model(str(model_path))
    metadata = {
        "feature_names": FEATURE_NAMES,
        "categories": ALL_CATEGORIES,
        "departments": ALL_DEPARTMENTS,
    }
    metadata_path.write_text(json.dumps(metadata, indent=2))
    return model


if __name__ == "__main__":
    train_and_save()
    print(f"Saved model to {MODEL_PATH} and metadata to {METADATA_PATH}")
