"""Routes invalid messages to `<topic>.dlq`.

`sink` is an injectable callback (topic, payload) -> None so the routing
decision is unit-testable without a live Kafka producer; `KafkaDlqSink`
below is the thin real-broker adapter used at runtime.
"""
from __future__ import annotations

import json
import time
from dataclasses import dataclass
from typing import Callable, Protocol

DlqSink = Callable[[str, dict], None]


def dlq_topic_for(topic: str) -> str:
    return f"{topic}.dlq"


@dataclass
class DeadLetterHandler:
    sink: DlqSink

    def route(self, topic: str, message: dict, error: Exception) -> str:
        target = dlq_topic_for(topic)
        envelope = {
            "original_topic": topic,
            "error": str(error),
            "message": message,
            "routed_at": time.time(),
        }
        self.sink(target, envelope)
        return target


class _ConfluentProducerLike(Protocol):
    def produce(self, topic: str, value: bytes, **kwargs) -> None: ...

    def poll(self, timeout: float) -> int: ...


class KafkaDlqSink:
    """Real-broker adapter: wraps a confluent_kafka.Producer."""

    def __init__(self, producer: _ConfluentProducerLike):
        self._producer = producer

    def __call__(self, topic: str, payload: dict) -> None:
        self._producer.produce(topic, value=json.dumps(payload).encode("utf-8"))
        self._producer.poll(0)
