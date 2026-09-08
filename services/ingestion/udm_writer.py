"""Consumes validated topics and upserts them into the Postgres UDM.

Row-building (`*_row` functions) is pure dict-in/dict-out so it is testable
without a database; `UdmWriter` is the thin SQLAlchemy adapter that actually
executes the upserts, and `main()` wires the real confluent-kafka Consumer.
"""
from __future__ import annotations

import json
import os
import sys
from datetime import date, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from sqlalchemy import (
    Column,
    Date,
    Engine,
    MetaData,
    Numeric,
    String,
    Table,
    Text,
    create_engine,
)
from sqlalchemy.dialects.postgresql import insert as pg_insert

from services.digital_twin.api import DigitalTwinApi, digital_twin_api
from services.ingestion.dead_letter_handler import DeadLetterHandler, KafkaDlqSink
from services.ingestion.schema_validator import SchemaValidationError, TOPICS, validate_message
from services.producers.reference_data import ASSETS

ASSET_LOOKUP: dict[str, dict] = {a["asset_id"]: a for a in ASSETS}

SOURCE_SYSTEM_BY_TOPIC = {
    "defect.tms.v1": "TMS",
    "defect.smms.v1": "SMMS",
    "defect.tdms.v1": "TDMS",
}

DIGITAL_TWIN_TOPICS = {"train.position.v1", "sensor.axle.v1", "sensor.hotbox.v1"}
DEFECT_TOPICS = set(SOURCE_SYSTEM_BY_TOPIC)
CORRIDOR_TOPIC = "corridor.availability.v1"

metadata = MetaData()

asset_table = Table(
    "asset",
    metadata,
    Column("asset_id", String, primary_key=True),
    Column("asset_type", String),
    Column("section", String),
    Column("chainage_km", Numeric),
)

defect_task_table = Table(
    "defect_task",
    metadata,
    Column("defect_id", String, primary_key=True),
    Column("asset_id", String),
    Column("source_system", String),
    Column("category", String),
    Column("severity", Numeric),
    Column("reported_date", Date),
    Column("due_date", Date),
    Column("department_owner", String),
    Column("priority_score", Numeric),
    Column("escalation_risk", Numeric),
)

corridor_block_slot_table = Table(
    "corridor_block_slot",
    metadata,
    Column("slot_id", String, primary_key=True),
    Column("section", String),
    Column("window_start", Text),
    Column("window_end", Text),
    Column("block_type", String),
    Column("traffic_density", Numeric),
)


def asset_row_for(asset_id: str) -> dict:
    known = ASSET_LOOKUP.get(asset_id)
    if known is not None:
        return dict(known)
    return {"asset_id": asset_id, "asset_type": "track", "section": "UNKNOWN", "chainage_km": 0.0}


def defect_task_row(topic: str, message: dict) -> dict:
    return {
        "defect_id": message["defect_id"],
        "asset_id": message["asset_id"],
        "source_system": SOURCE_SYSTEM_BY_TOPIC[topic],
        "category": message["category"],
        "severity": message["severity"],
        "reported_date": message["reported_date"],
        "due_date": message["due_date"],
        "department_owner": message["department_owner"],
    }


def corridor_slot_id(message: dict) -> str:
    return f"{message['section']}|{message['window_start']}|{message['block_type']}"


def corridor_slot_row(message: dict) -> dict:
    return {
        "slot_id": corridor_slot_id(message),
        "section": message["section"],
        "window_start": message["window_start"],
        "window_end": message["window_end"],
        "block_type": message["block_type"],
        "traffic_density": None,
    }


class UdmWriter:
    def __init__(self, engine: Engine, twin: DigitalTwinApi | None = None):
        self._engine = engine
        self._twin = twin or digital_twin_api

    def handle(self, topic: str, message: dict) -> None:
        if topic in DIGITAL_TWIN_TOPICS:
            self._twin.ingest(topic, message)
        elif topic in DEFECT_TOPICS:
            self._upsert_defect(topic, message)
        elif topic == CORRIDOR_TOPIC:
            self._upsert(corridor_block_slot_table, corridor_slot_row(message), "slot_id")

    def _upsert_defect(self, topic: str, message: dict) -> None:
        asset_row = asset_row_for(message["asset_id"])
        with self._engine.begin() as conn:
            conn.execute(
                pg_insert(asset_table)
                .values(**asset_row)
                .on_conflict_do_nothing(index_elements=["asset_id"])
            )
            conn.execute(
                pg_insert(defect_task_table)
                .values(**defect_task_row(topic, message))
                .on_conflict_do_update(
                    index_elements=["defect_id"],
                    set_=defect_task_row(topic, message),
                )
            )

    def _upsert(self, table: Table, row: dict, pk_column: str) -> None:
        with self._engine.begin() as conn:
            conn.execute(
                pg_insert(table)
                .values(**row)
                .on_conflict_do_update(index_elements=[pk_column], set_=row)
            )


def build_engine() -> Engine:
    url = os.environ.get(
        "POSTGRES_URL", "postgresql+psycopg://traindb:traindb@localhost:5432/traindb"
    )
    return create_engine(url, future=True)


def main() -> None:
    from confluent_kafka import Consumer, Producer

    bootstrap_servers = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    consumer = Consumer(
        {
            "bootstrap.servers": bootstrap_servers,
            "group.id": "udm-writer",
            "auto.offset.reset": "earliest",
        }
    )
    consumer.subscribe(list(TOPICS))

    dlq_producer = Producer({"bootstrap.servers": bootstrap_servers})
    dlq_handler = DeadLetterHandler(sink=KafkaDlqSink(dlq_producer))
    writer = UdmWriter(build_engine())

    try:
        while True:
            record = consumer.poll(1.0)
            if record is None or record.error():
                continue
            topic = record.topic()
            message = json.loads(record.value())
            try:
                validate_message(topic, message)
            except SchemaValidationError as exc:
                dlq_handler.route(topic, message, exc)
                continue
            writer.handle(topic, message)
    except KeyboardInterrupt:
        pass
    finally:
        consumer.close()


if __name__ == "__main__":
    main()
