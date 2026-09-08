"""Validates ingestion/producer messages against the repo's Avro contracts.

Schemas are parsed once and cached by topic name (`_load_schema` is an
`lru_cache`'d function) so hot producer/consumer loops never re-read or
re-parse a `.avsc` file per message.
"""
from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path

import fastavro
from fastavro.validation import ValidationError as _FastavroValidationError

SCHEMA_DIR = Path(__file__).resolve().parent.parent.parent / "schemas" / "avro"

TOPIC_SCHEMA_FILES: dict[str, str] = {
    "train.position.v1": "train_position.v1.avsc",
    "sensor.axle.v1": "sensor_axle.v1.avsc",
    "sensor.hotbox.v1": "sensor_hotbox.v1.avsc",
    "defect.tms.v1": "defect_tms.v1.avsc",
    "defect.smms.v1": "defect_smms.v1.avsc",
    "defect.tdms.v1": "defect_tdms.v1.avsc",
    "corridor.availability.v1": "corridor_availability.v1.avsc",
    "timetable.v1": "timetable.v1.avsc",
    "goods.forecast.v1": "goods_forecast.v1.avsc",
    "weather.v1": "weather.v1.avsc",
    "recommendation.log.v1": "recommendation_log.v1.avsc",
    "block.plan.v1": "block_plan.v1.avsc",
}

TOPICS: tuple[str, ...] = tuple(TOPIC_SCHEMA_FILES)


class SchemaValidationError(ValueError):
    def __init__(self, topic: str, detail: str, field: str | None = None):
        self.topic = topic
        self.detail = detail
        self.field = field
        super().__init__(f"[{topic}] schema validation failed: {detail}")


def known_topics() -> tuple[str, ...]:
    return TOPICS


@lru_cache(maxsize=None)
def _load_schema(topic: str) -> dict:
    file_name = TOPIC_SCHEMA_FILES.get(topic)
    if file_name is None:
        raise KeyError(f"no Avro schema registered for topic {topic!r}")
    with (SCHEMA_DIR / file_name).open() as fh:
        return fastavro.parse_schema(json.load(fh))


def _extract_field(topic: str, detail: str) -> str | None:
    schema = _load_schema(topic)
    record_name = schema.get("name", "")
    match = re.search(rf"{re.escape(record_name)}\.(\w+)", detail)
    return match.group(1) if match else None


def validate_message(topic: str, message: dict) -> dict:
    """Returns `message` unchanged if valid; raises SchemaValidationError otherwise."""
    schema = _load_schema(topic)
    try:
        fastavro.validate(message, schema, strict=True, raise_errors=True)
    except _FastavroValidationError as exc:
        detail = str(exc)
        raise SchemaValidationError(topic, detail, field=_extract_field(topic, detail)) from exc
    return message


def is_valid(topic: str, message: dict) -> bool:
    try:
        validate_message(topic, message)
        return True
    except SchemaValidationError:
        return False
