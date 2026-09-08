"""Task 5.5: persists a controller's decision on a conflict-resolution
recommendation, and best-effort mirrors it onto `recommendation.log.v1`.

The DB write is the source of truth (the `/conflicts/{id}/resolve` acceptance
test checks it directly); the Kafka produce is deliberately best-effort and
wrapped so it can never raise past this function or block the DB write --
there is no broker in this sandbox, and in real deployments a controller's
decision should not be lost just because the broker happened to be
unreachable at that instant.
"""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import Engine

logger = logging.getLogger(__name__)

RECOMMENDATION_LOG_TOPIC = "recommendation.log.v1"


def _scores_for_options(options: list[dict]) -> list[float]:
    return [float(o.get("score", 0.0)) for o in options if isinstance(o, dict)]


def log_recommendation(
    conflict_id: str,
    options: list[dict],
    scores: list[dict] | list[float] | None = None,
    controller_action: str = "accepted",
    realized_outcome: str | None = None,
    engine: Engine | None = None,
) -> str:
    """Writes one `recommendation_log` row and returns its `recommendation_id`.

    `options` is the full set (or the single chosen/edited option) the
    controller acted on; `scores` defaults to each option's own `score` field
    when not given explicitly, so a caller with only an `options` list does
    not have to duplicate that value.
    """
    from services.ingestion.udm_writer import portable_upsert, recommendation_log_table

    if scores is None:
        scores = _scores_for_options(options)

    recommendation_id = f"REC-{uuid.uuid4().hex[:16]}"
    row = {
        "recommendation_id": recommendation_id,
        "conflict_id": conflict_id,
        "options_json": options,
        "scores_json": scores,
        "controller_action": controller_action,
        "realized_outcome": realized_outcome,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    if engine is not None:
        with engine.begin() as conn:
            portable_upsert(conn, recommendation_log_table, row, "recommendation_id")

    _best_effort_produce(row, options, scores)
    return recommendation_id


def _best_effort_produce(row: dict, options: list[dict], scores: list[Any]) -> None:
    try:
        from services.producers.kafka_utils import build_producer, publish

        message = {
            "recommendation_id": row["recommendation_id"],
            "conflict_id": row["conflict_id"] or "",
            # recommendation_log.v1 (Avro) carries options as array<string> and
            # scores as array<double> -- unlike the DB row's JSON columns, the
            # wire schema predates this router and is not something Phase 4
            # should change, so each option is JSON-encoded to fit it.
            "options": [json.dumps(o) for o in options],
            "scores": [float(s) for s in scores] if scores else _scores_for_options(options),
            "controller_action": row["controller_action"],
            "realized_outcome": row["realized_outcome"],
        }
        producer = build_producer()
        publish(producer, RECOMMENDATION_LOG_TOPIC, message, key=message["conflict_id"] or row["recommendation_id"])
        producer.flush(1)
    except Exception as exc:
        logger.warning(
            "recommendation.log.v1 produce failed (no broker in this environment?): %s", exc
        )
