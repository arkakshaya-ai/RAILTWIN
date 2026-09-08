"""Scores defect_task rows with the trained priority model.

`score_batch` is pure (defect dicts in, score dicts out) so it is testable
without XGBoost's training step or a database; `write_scores_to_db` is a
thin, separately-injectable SQLAlchemy step so a caller can run it against a
real engine while tests exercise scoring alone.

top_features uses the model's global gain-based feature_importances_ rather
than a per-instance SHAP explanation: the batch API contract only asks for
"top 3 feature names/importances", SHAP would add a real dependency and a
materially slower scoring path for a batch job, and the global ranking is
stable and sufficient for planners to understand *why the model weighs what
it weighs* even though it doesn't vary row-to-row.
"""
from __future__ import annotations

import json
from datetime import date, datetime
from pathlib import Path

import numpy as np
import xgboost as xgb
from sqlalchemy import Engine

from services.priority_scoring.train_model import (
    ALL_CATEGORIES,
    ALL_DEPARTMENTS,
    FEATURE_NAMES,
    METADATA_PATH,
    MODEL_PATH,
    train_and_save,
)

_model: xgb.XGBRegressor | None = None
_metadata: dict | None = None


def _load_model() -> tuple[xgb.XGBRegressor, dict]:
    global _model, _metadata
    if _model is not None and _metadata is not None:
        return _model, _metadata

    if not MODEL_PATH.exists() or not METADATA_PATH.exists():
        train_and_save()

    model = xgb.XGBRegressor()
    model.load_model(str(MODEL_PATH))
    metadata = json.loads(METADATA_PATH.read_text())

    _model, _metadata = model, metadata
    return model, metadata


def _as_date(value) -> date:
    if isinstance(value, date):
        return value
    if isinstance(value, datetime):
        return value.date()
    return date.fromisoformat(str(value))


def _days_overdue(defect: dict, today: date | None = None) -> float:
    today = today or date.today()
    due = _as_date(defect["due_date"])
    return float(max(0, (today - due).days))


def build_feature_vector(defect: dict, metadata: dict, today: date | None = None) -> list[float]:
    categories = metadata["categories"]
    departments = metadata["departments"]

    category = defect.get("category")
    category_encoded = float(categories.index(category)) if category in categories else -1.0

    department = defect.get("department_owner")
    department_encoded = float(departments.index(department)) if department in departments else -1.0

    return [
        float(defect.get("severity", 0)),
        _days_overdue(defect, today=today),
        category_encoded,
        department_encoded,
        float(defect.get("historical_escalation_count", 0)),
    ]


def score_batch(defects: list[dict], today: date | None = None) -> list[dict]:
    model, metadata = _load_model()
    if not defects:
        return []

    features = np.array([build_feature_vector(d, metadata, today=today) for d in defects])
    raw_scores = model.predict(features)

    importances = model.feature_importances_
    ranked = sorted(
        zip(metadata["feature_names"], importances), key=lambda pair: pair[1], reverse=True
    )
    top_features = [
        {"feature": name, "importance": round(float(imp), 4)} for name, imp in ranked[:3]
    ]

    results = []
    for defect, raw_score in zip(defects, raw_scores):
        score = float(np.clip(raw_score, 0.0, 1.0))
        results.append(
            {
                "defect_id": defect["defect_id"],
                "priority_score": round(score, 4),
                "top_features": top_features,
            }
        )
    return results


def write_scores_to_db(scores: list[dict], engine: Engine) -> None:
    from services.ingestion.udm_writer import defect_task_table

    if not scores:
        return

    with engine.begin() as conn:
        for row in scores:
            conn.execute(
                defect_task_table.update()
                .where(defect_task_table.c.defect_id == row["defect_id"])
                .values(priority_score=row["priority_score"])
            )
