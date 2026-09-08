"""Shared confluent-kafka wiring for every producer script."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from confluent_kafka import Producer

from services.ingestion.schema_validator import validate_message


def bootstrap_servers() -> str:
    return os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")


def build_producer(**overrides) -> Producer:
    config = {"bootstrap.servers": bootstrap_servers()}
    config.update(overrides)
    return Producer(config)


def _delivery_report(err, msg) -> None:
    if err is not None:
        print(f"delivery failed for {msg.topic()}: {err}", file=sys.stderr)


def publish(producer: Producer, topic: str, message: dict, key: str | None = None) -> None:
    validate_message(topic, message)
    producer.produce(
        topic,
        key=key.encode("utf-8") if key else None,
        value=json.dumps(message).encode("utf-8"),
        callback=_delivery_report,
    )
    producer.poll(0)
