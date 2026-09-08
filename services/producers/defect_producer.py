"""Synthetic TMS/SMMS/TDMS defect events referencing assets from reference_data.

Fixed seed (default 42) so repeated demo runs generate the same sequence of
defect_ids/severities/assets, which makes recorded demos and screenshots
reproducible.
"""
from __future__ import annotations

import argparse
import random
import sys
import time
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from services.producers.kafka_utils import build_producer, publish
from services.producers.reference_data import ASSETS, DEFECT_CATEGORIES, DEPARTMENT_OWNER

TOPIC_BY_SOURCE = {
    "TMS": "defect.tms.v1",
    "SMMS": "defect.smms.v1",
    "TDMS": "defect.tdms.v1",
}

SOURCE_BY_ASSET_TYPE = {
    "track": "TMS",
    "signal": "SMMS",
    "ohe": "TDMS",
}

DEFAULT_MIN_INTERVAL_SECONDS = 8.0
DEFAULT_MAX_INTERVAL_SECONDS = 40.0


def build_defect_message(asset: dict, rng: random.Random, now: datetime | None = None) -> tuple[str, dict]:
    now = now or datetime.now(timezone.utc)
    source = SOURCE_BY_ASSET_TYPE[asset["asset_type"]]
    due = now + timedelta(days=rng.randint(3, 30))
    message = {
        "defect_id": f"DFX-{uuid.uuid4().hex[:12]}",
        "asset_id": asset["asset_id"],
        "category": rng.choice(DEFECT_CATEGORIES[source]),
        "severity": rng.randint(1, 5),
        "reported_date": now.date().isoformat(),
        "due_date": due.date().isoformat(),
        "department_owner": DEPARTMENT_OWNER[source],
    }
    return TOPIC_BY_SOURCE[source], message


def build_argparser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Simulate sparse TMS/SMMS/TDMS defect events.")
    parser.add_argument("--min-interval-seconds", type=float, default=DEFAULT_MIN_INTERVAL_SECONDS)
    parser.add_argument("--max-interval-seconds", type=float, default=DEFAULT_MAX_INTERVAL_SECONDS)
    parser.add_argument("--seed", type=int, default=42)
    return parser


def main() -> None:
    args = build_argparser().parse_args()
    rng = random.Random(args.seed)
    producer = build_producer()
    try:
        while True:
            asset = rng.choice(ASSETS)
            topic, message = build_defect_message(asset, rng)
            publish(producer, topic, message, key=message["asset_id"])
            producer.flush(1)
            time.sleep(rng.uniform(args.min_interval_seconds, args.max_interval_seconds))
    except KeyboardInterrupt:
        pass
    finally:
        producer.flush(5)


if __name__ == "__main__":
    main()
