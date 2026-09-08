"""Internal query interface over the digital twin's fused state.

Phase 4's `services/planning_api/routers/network.py` imports `digital_twin_api`
(or constructs its own `DigitalTwinApi(store)`) rather than reaching into
`StateStore` directly, keeping the state store's internals free to change.
"""
from __future__ import annotations

from services.digital_twin.state_store import StateStore


class DigitalTwinApi:
    def __init__(self, store: StateStore | None = None):
        self._store = store or StateStore()

    @property
    def store(self) -> StateStore:
        return self._store

    def ingest(self, topic: str, message: dict) -> None:
        self._store.apply_message(topic, message)

    def get_section_state(self, section: str) -> dict:
        return self._store.get_section_state(section)

    def get_network_state(self) -> dict:
        return self._store.get_network_state()


digital_twin_api = DigitalTwinApi()
