"""Pydantic request/response models for every Section-5 route.

Response models are deliberately permissive (`extra="allow"` where an
underlying engine's dict already carries a richer, useful shape, e.g.
solver.py's resolution options) -- the contract listed here is a minimum,
not a maximum.
"""
from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict


class TrainState(BaseModel):
    train_id: str
    section: str
    chainage_km: float
    speed_kmph: float
    direction: str
    timestamp: str


class SensorState(BaseModel):
    model_config = ConfigDict(extra="allow")

    sensor_id: str
    section: str
    chainage_km: float
    timestamp: str
    sensor_type: Literal["axle", "hotbox"]
    attributes: dict[str, Any]


class BlockSlot(BaseModel):
    model_config = ConfigDict(extra="allow")

    slot_id: str
    section: Optional[str] = None
    window_start: Optional[str] = None
    window_end: Optional[str] = None
    block_type: Optional[str] = None
    traffic_density: Optional[float] = None


class NetworkStateResponse(BaseModel):
    trains: list[TrainState]
    sensors: list[SensorState]
    blocks: list[BlockSlot]


class ConflictSummary(BaseModel):
    id: str
    section: str
    eta: str
    severity: str


class ConflictsResponse(BaseModel):
    conflicts: list[ConflictSummary]


class ResolutionOption(BaseModel):
    model_config = ConfigDict(extra="allow")

    action: str
    score: float
    rationale: str
    constraints_checked: list[str]


class ConflictOptionsResponse(BaseModel):
    options: list[ResolutionOption]
    rejected: list[dict[str, Any]] = []
    proven_optimal: Optional[bool] = None
    fail_safe: Optional[bool] = None


class ResolveRequest(BaseModel):
    """The controller's chosen (or edited) option, plus their action/outcome
    on it. `option` is accepted as a free-form dict rather than
    `ResolutionOption` so a controller-edited option (e.g. a manually
    adjusted `resolved_start_min`) doesn't have to round-trip through the
    same strict shape the solver produced it in.
    """

    option: dict[str, Any]
    edits: Optional[dict[str, Any]] = None
    controller_action: str = "accepted"
    realized_outcome: Optional[str] = None


class ResolveResponse(BaseModel):
    status: str
    recommendation_id: str


class DefectPriority(BaseModel):
    defect_id: str
    priority_score: float
    top_features: list[dict[str, Any]]
    escalation_risk: Optional[float] = None


class DefectsResponse(BaseModel):
    defects: list[DefectPriority]


class BlockPlanSlot(BaseModel):
    slot_id: str
    section: Optional[str] = None
    window_start: Optional[str] = None
    window_end: Optional[str] = None
    departments: list[str]
    task_ids: list[str]


class WeeklyBlockPlanResponse(BaseModel):
    plan_id: str
    slots: list[BlockPlanSlot]
    source: Literal["db", "fallback_solve"]


class BlockPlanSection(BaseModel):
    section: str
    departments: list[str]
    task_ids: list[str]
    slot_ids: list[str]


class MonthlyBlockPlanResponse(BaseModel):
    plan_id: str
    sections: list[BlockPlanSection]
    source: Literal["db", "fallback_solve"]


class EmergencyTriggerRequest(BaseModel):
    section: Optional[str] = None
    asset_id: Optional[str] = None
    reason: Optional[str] = None


class EmergencyTriggerResponse(BaseModel):
    status: str
    reoptimization_id: str
    # Additive (Task 6.4): summaries of the joint traffic/block
    # re-optimization this trigger ran. None by default so a caller/test
    # built against the Phase-4 stub contract still parses this response.
    traffic_result: Optional[dict[str, Any]] = None
    block_result: Optional[dict[str, Any]] = None


class ServiceHealthEntry(BaseModel):
    status: Literal["up", "down"]
    latency_ms: float
    last_heartbeat: Optional[str] = None


class HealthResponse(BaseModel):
    ai_engine: Literal["up", "down"]
    last_heartbeat: Optional[str] = None
    # Additive (Task 6.1): per-service breakdown behind the same aggregate
    # `ai_engine`/`last_heartbeat` fields above. Defaults to {} so the old
    # response shape (just the two aggregate fields) is still a strict
    # subset of this one.
    services: dict[str, ServiceHealthEntry] = {}
