"""In-memory latest-weather-per-section store, same lock-guarded pattern as `state_store.py`.

`weather.v1`-shaped messages only carry the latest reading, mirroring
`StateStore` -- there is no persistent history here either, just enough to
answer "what should a conflict-resolution call assume right now for this
section" without every caller re-deriving that from a raw weather message.
"""
from __future__ import annotations

import threading

from services.traffic_optimizer.safety_validation import DEFAULT_SPEED_RESTRICTION_KMPH


class WeatherStore:
    def __init__(self):
        self._lock = threading.Lock()
        self._by_section: dict[str, dict] = {}

    def update(self, message: dict) -> None:
        section = message["section"]
        with self._lock:
            self._by_section[section] = dict(message)

    def get_section_weather(self, section: str) -> dict | None:
        with self._lock:
            reading = self._by_section.get(section)
            return dict(reading) if reading is not None else None

    def effective_speed_restriction_kmph(
        self, section: str, default: float = DEFAULT_SPEED_RESTRICTION_KMPH
    ) -> float:
        reading = self.get_section_weather(section)
        if reading is None or reading.get("speed_restriction_kmph") is None:
            return default
        return float(reading["speed_restriction_kmph"])


# Mirrors services.digital_twin.api.digital_twin_api's pattern: one process-
# wide store both fast_tier.py and planning_api import, rather than each
# wiring their own instance through call chains.
weather_store = WeatherStore()
