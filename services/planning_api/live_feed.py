"""Background live-tracking consumer for the planning API process.

`services/ingestion/udm_writer.py` writes train/sensor/defect/corridor
events into Postgres and, as a side effect, into a `DigitalTwinApi`
instance -- but `docker-compose.yml` runs `udm_writer` and `planning_api`
as separate containers, each with its own Python-process-local
`digital_twin_api` / `weather_store` singleton (see
`services/digital_twin/api.py`, `services/digital_twin/weather_store.py`).
Without a consumer running inside the `planning_api` process itself,
`GET /api/v1/network/state` and every route reading `weather_store` would
only ever see this process's one-time `demo_data.py` seed and never real
live Kafka data once actually deployed -- the digital twin would look
"live" in a single-process dev run but go static the moment the two
services are split into containers.

`LiveFeedConsumer` is that missing consumer: its own confluent-kafka
consumer group (`CONSUMER_GROUP_ID`, independent of udm_writer's
`"udm-writer"` group so both processes independently receive every
message on the topics they each care about), subscribed only to the
topics this process's in-memory stores read
(`train.position.v1`, `sensor.axle.v1`, `sensor.hotbox.v1`,
`weather.v1`), polled from a daemon thread started by `main.py`'s
lifespan. It never raises out of `start()`: a broker that is down or
unreachable (this sandbox, most unit tests) just leaves the thread
idling on `poll()` timeouts, exactly like `main.py`'s other
"never crash startup" steps.
"""
from __future__ import annotations

import json
import logging
import os
import threading

from services.digital_twin.api import DigitalTwinApi, digital_twin_api
from services.digital_twin.weather_store import WeatherStore, weather_store
from services.ingestion.schema_validator import SchemaValidationError, validate_message

logger = logging.getLogger(__name__)

LIVE_FEED_TOPICS = ("train.position.v1", "sensor.axle.v1", "sensor.hotbox.v1", "weather.v1")
CONSUMER_GROUP_ID = "planning-api-live-feed"
POLL_TIMEOUT_SECONDS = 0.5


def route_message(
    topic: str,
    message: dict,
    twin: DigitalTwinApi | None = None,
    weather: WeatherStore | None = None,
) -> None:
    """Pure dispatch: weather updates the weather store, everything else
    feeds the digital twin. Kept free of the Consumer wiring below so it is
    unit-testable without a broker."""
    twin = twin or digital_twin_api
    weather = weather or weather_store
    if topic == "weather.v1":
        weather.update(message)
    else:
        twin.ingest(topic, message)


class LiveFeedConsumer:
    """Owns one confluent-kafka Consumer polled from a dedicated daemon thread."""

    def __init__(self, bootstrap_servers: str | None = None):
        self._bootstrap_servers = bootstrap_servers or os.environ.get(
            "KAFKA_BOOTSTRAP_SERVERS", "localhost:9092"
        )
        self._consumer = None
        self._thread: threading.Thread | None = None
        self._stop_event = threading.Event()

    def start(self) -> None:
        try:
            from confluent_kafka import Consumer
        except Exception as exc:
            logger.warning("live feed: confluent_kafka unavailable, live tracking disabled: %s", exc)
            return

        try:
            consumer = Consumer(
                {
                    "bootstrap.servers": self._bootstrap_servers,
                    "group.id": CONSUMER_GROUP_ID,
                    "auto.offset.reset": "earliest",
                    "error_cb": lambda err: logger.debug("live feed kafka error: %s", err),
                }
            )
            consumer.subscribe(list(LIVE_FEED_TOPICS))
        except Exception as exc:
            logger.warning("live feed: failed to start Kafka consumer, live tracking disabled: %s", exc)
            return

        self._consumer = consumer
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run, name="planning-api-live-feed", daemon=True)
        self._thread.start()
        logger.info("live feed: consuming %s as group %r", LIVE_FEED_TOPICS, CONSUMER_GROUP_ID)

    def _run(self) -> None:
        consumer = self._consumer
        while not self._stop_event.is_set():
            try:
                record = consumer.poll(POLL_TIMEOUT_SECONDS)
            except Exception as exc:
                logger.warning("live feed: poll failed, retrying: %s", exc)
                continue
            if record is None or record.error():
                continue
            topic = record.topic()
            try:
                message = json.loads(record.value())
                validate_message(topic, message)
            except (SchemaValidationError, ValueError) as exc:
                logger.warning("live feed: dropping malformed %s message: %s", topic, exc)
                continue
            try:
                route_message(topic, message)
            except Exception as exc:
                logger.warning("live feed: failed to apply %s message: %s", topic, exc)

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread is not None:
            self._thread.join(timeout=2.0)
        if self._consumer is not None:
            try:
                self._consumer.close()
            except Exception:
                pass


def start_live_feed() -> LiveFeedConsumer | None:
    if os.environ.get("KAFKA_LIVE_FEED_ENABLED", "true").strip().lower() == "false":
        logger.info("live feed: disabled via KAFKA_LIVE_FEED_ENABLED=false")
        return None
    consumer = LiveFeedConsumer()
    consumer.start()
    return consumer
