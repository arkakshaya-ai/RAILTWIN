"""GET /network/state.

Reshapes `digital_twin_api.get_network_state()`'s per-section dict into the
flattened `{trains, sensors, blocks}` contract. `blocks` reads the latest
`corridor_block_slot` rows from the DB only as a courtesy: train positions
and sensor state must stay live even if the DB/downstream systems are down
(Section 7 NFR -- this route is Phase 6's groundwork for that), so a DB
failure here is caught and logged, never raised, and just yields `blocks: []`.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends
from sqlalchemy import select

from services.digital_twin.api import digital_twin_api
from services.ingestion.udm_writer import corridor_block_slot_table
from services.planning_api.deps import get_engine
from services.planning_api.models import NetworkStateResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/network/state", response_model=NetworkStateResponse)
def get_network_state(engine=Depends(get_engine)) -> NetworkStateResponse:
    network_state = digital_twin_api.get_network_state()

    trains: list[dict] = []
    sensors: list[dict] = []
    for section_state in network_state.values():
        trains.extend(section_state.get("trains", []))
        for axle in section_state.get("axle_sensors", []):
            sensors.append({**axle, "sensor_type": "axle"})
        for hotbox in section_state.get("hotbox_sensors", []):
            sensors.append({**hotbox, "sensor_type": "hotbox"})

    blocks: list[dict] = []
    try:
        with engine.connect() as conn:
            rows = conn.execute(select(corridor_block_slot_table)).mappings().all()
            blocks = [dict(row) for row in rows]
    except Exception as exc:
        logger.warning("network/state: corridor_block_slot read failed, returning blocks=[]: %s", exc)

    return NetworkStateResponse(trains=trains, sensors=sensors, blocks=blocks)
