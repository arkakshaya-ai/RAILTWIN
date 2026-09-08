"""Shared reference data so every producer agrees on sections, chainages, and assets.

Kept as plain data (no I/O) so it can be imported by producers, tests, and the
ingestion layer without pulling in Kafka or Postgres dependencies.
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Section:
    name: str
    start_km: float
    end_km: float


SECTIONS: list[Section] = [
    Section("SEC-A", 0.0, 42.5),
    Section("SEC-B", 42.5, 88.0),
    Section("SEC-C", 88.0, 131.0),
    Section("SEC-D", 131.0, 176.5),
]

SECTION_NAMES: list[str] = [s.name for s in SECTIONS]

TRAIN_IDS: list[str] = [f"TRN-{i:03d}" for i in range(1, 13)]

ASSET_TYPES: list[str] = ["track", "signal", "ohe"]


def _build_assets() -> list[dict]:
    assets = []
    for section in SECTIONS:
        span = section.end_km - section.start_km
        for idx, asset_type in enumerate(ASSET_TYPES * 3):
            offset = (span / (len(ASSET_TYPES) * 3)) * idx
            chainage = round(section.start_km + offset, 3)
            assets.append(
                {
                    "asset_id": f"AST-{section.name}-{asset_type.upper()}-{idx:02d}",
                    "asset_type": asset_type,
                    "section": section.name,
                    "chainage_km": chainage,
                }
            )
    return assets


ASSETS: list[dict] = _build_assets()
ASSET_IDS: list[str] = [a["asset_id"] for a in ASSETS]


def _build_sensors(prefix: str) -> list[dict]:
    sensors = []
    for section in SECTIONS:
        span = section.end_km - section.start_km
        for idx in range(4):
            chainage = round(section.start_km + span * (idx / 4), 3)
            sensors.append(
                {
                    "sensor_id": f"{prefix}-{section.name}-{idx:02d}",
                    "section": section.name,
                    "chainage_km": chainage,
                }
            )
    return sensors


AXLE_SENSORS: list[dict] = _build_sensors("AXL")
HOTBOX_SENSORS: list[dict] = _build_sensors("HBX")

DEPARTMENT_OWNER = {
    "TMS": "Engineering",
    "SMMS": "S&T",
    "TDMS": "TRD",
}

DEFECT_CATEGORIES = {
    "TMS": ["rail_crack", "ballast_wear", "gauge_deviation", "weld_defect"],
    "SMMS": ["signal_fault", "point_failure", "interlocking_fault", "cable_fault"],
    "TDMS": ["ohe_sag", "insulator_damage", "feeder_fault", "traction_motor_fault"],
}


def section_for_chainage(chainage_km: float) -> str:
    for section in SECTIONS:
        if section.start_km <= chainage_km <= section.end_km:
            return section.name
    return SECTIONS[-1].name
