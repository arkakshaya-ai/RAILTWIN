"""In-memory fused state of the corridor, keyed by section.

A single `threading.Lock` guards all mutation/read paths. That is enough
for this phase's access pattern (one ingestion consumer loop writing,
an internal API reading) without pulling in an async runtime here.
"""
from __future__ import annotations

import threading
from dataclasses import asdict, dataclass

from services.producers.reference_data import SECTION_NAMES, section_for_chainage


@dataclass
class TrainReading:
    train_id: str
    section: str
    chainage_km: float
    speed_kmph: float
    direction: str
    timestamp: str


@dataclass
class SensorReading:
    sensor_id: str
    section: str
    chainage_km: float
    timestamp: str
    attributes: dict


class StateStore:
    def __init__(self):
        self._lock = threading.Lock()
        self._trains: dict[str, dict[str, TrainReading]] = {}
        self._axle: dict[str, dict[str, SensorReading]] = {}
        self._hotbox: dict[str, dict[str, SensorReading]] = {}

    def update_train_position(self, message: dict) -> None:
        section = message["section"]
        reading = TrainReading(
            train_id=message["train_id"],
            section=section,
            chainage_km=message["chainage_km"],
            speed_kmph=message["speed_kmph"],
            direction=message["direction"],
            timestamp=message["timestamp"],
        )
        with self._lock:
            self._trains.setdefault(section, {})[reading.train_id] = reading

    def update_axle_sensor(self, message: dict) -> None:
        section = section_for_chainage(message["chainage_km"])
        reading = SensorReading(
            sensor_id=message["sensor_id"],
            section=section,
            chainage_km=message["chainage_km"],
            timestamp=message["timestamp"],
            attributes={"occupancy_state": message["occupancy_state"]},
        )
        with self._lock:
            self._axle.setdefault(section, {})[reading.sensor_id] = reading

    def update_hotbox_sensor(self, message: dict) -> None:
        section = section_for_chainage(message["chainage_km"])
        reading = SensorReading(
            sensor_id=message["sensor_id"],
            section=section,
            chainage_km=message["chainage_km"],
            timestamp=message["timestamp"],
            attributes={
                "temperature_c": message["temperature_c"],
                "threshold_breach": message["threshold_breach"],
            },
        )
        with self._lock:
            self._hotbox.setdefault(section, {})[reading.sensor_id] = reading

    def apply_message(self, topic: str, message: dict) -> None:
        if topic == "train.position.v1":
            self.update_train_position(message)
        elif topic == "sensor.axle.v1":
            self.update_axle_sensor(message)
        elif topic == "sensor.hotbox.v1":
            self.update_hotbox_sensor(message)
        else:
            raise ValueError(f"state store does not fuse topic {topic!r}")

    def get_section_state(self, section: str) -> dict:
        with self._lock:
            trains = [asdict(t) for t in self._trains.get(section, {}).values()]
            axle = [asdict(s) for s in self._axle.get(section, {}).values()]
            hotbox = [asdict(s) for s in self._hotbox.get(section, {}).values()]
        return {
            "section": section,
            "trains": trains,
            "axle_sensors": axle,
            "hotbox_sensors": hotbox,
        }

    def get_network_state(self) -> dict:
        return {section: self.get_section_state(section) for section in SECTION_NAMES}
