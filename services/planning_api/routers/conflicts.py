"""GET /conflicts, GET /conflicts/{id}/options, POST /conflicts/{id}/resolve.

`fast_tier.predict_conflicts`'s `id`s are derived from section + involved
train_ids + the call's own `now()` timestamp, so they are stable only for
the lifetime of a single `/conflicts` response, not across repeated calls
with a moving clock. There is no persistent conflict store yet (later-phase
territory), so this router keeps a simple module-level dict from the last
`/conflicts` call's ids to their full conflict dicts (trains_involved
included); `/conflicts/{id}/options` looks a conflict up here instead of
re-running prediction and risking a different id for the "same" conflict.
Known simplification: single-process, in-memory, last-call-wins, lost on
restart.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from services.conflict_prediction.fast_tier import predict_conflicts
from services.conflict_prediction.fast_tier_fallback import fallback_resolution
from services.digital_twin.api import digital_twin_api
from services.digital_twin.weather_store import weather_store
from services.feedback_loop.logger import log_recommendation
from services.planning_api.deps import get_engine
from services.planning_api.models import (
    ConflictOptionsResponse,
    ConflictsResponse,
    ResolveRequest,
    ResolveResponse,
)
from services.planning_api.train_enrichment import enrich_trains
from services.traffic_optimizer.anytime_wrapper import resolve_conflict

router = APIRouter()

# Known simplification documented above: last `/conflicts` call's ids only.
_conflict_cache: dict[str, dict] = {}


@router.get("/conflicts", response_model=ConflictsResponse)
def list_conflicts() -> ConflictsResponse:
    network_state = digital_twin_api.get_network_state()
    conflicts = predict_conflicts(network_state)

    _conflict_cache.clear()
    _conflict_cache.update({c["id"]: c for c in conflicts})

    return ConflictsResponse(
        conflicts=[
            {"id": c["id"], "section": c["section"], "eta": c["eta"], "severity": c["severity"]}
            for c in conflicts
        ]
    )


@router.get("/conflicts/{conflict_id}/options", response_model=ConflictOptionsResponse)
def get_conflict_options(
    conflict_id: str,
    speed_restriction_kmph: float | None = None,
    headway_minutes: float | None = None,
) -> ConflictOptionsResponse:
    cached = _conflict_cache.get(conflict_id)
    if cached is None:
        raise HTTPException(
            status_code=404,
            detail=f"unknown or expired conflict id: {conflict_id!r} (call GET /conflicts first)",
        )

    network_state = digital_twin_api.get_network_state()
    section_trains = network_state.get(cached["section"], {}).get("trains", [])
    involved_ids = set(cached["trains_involved"])
    trains = [t for t in section_trains if t["train_id"] in involved_ids]

    if len(trains) < 2:
        raise HTTPException(
            status_code=409,
            detail="conflict trains are no longer both present in the digital twin's section state",
        )

    conflict = {"section": cached["section"], "trains": enrich_trains(trains)}

    # Task 6.3: when the caller doesn't pass an explicit override, the
    # section's live weather reading (if any) sets the effective speed
    # restriction instead of silently falling back to the flat
    # safety_validation.DEFAULT_SPEED_RESTRICTION_KMPH -- weather becomes a
    # real input to which candidates get hard-rejected, not just a display
    # value elsewhere in the app.
    kwargs: dict = {
        "speed_restriction_kmph": (
            speed_restriction_kmph
            if speed_restriction_kmph is not None
            else weather_store.effective_speed_restriction_kmph(cached["section"])
        )
    }
    if headway_minutes is not None:
        kwargs["headway_minutes"] = headway_minutes

    result = resolve_conflict(conflict, **kwargs)
    options = result.get("options", [])
    # Task 6.2: the deep optimizer produced nothing usable inside its
    # budget (fail_safe with zero options) -- don't leave the controller
    # with nothing actionable, append the instant rule-based fallback.
    # `fail_safe`/`rejected` stay exactly as the deep tier returned them.
    if result.get("fail_safe") and not options:
        options = [fallback_resolution(conflict)]
    return ConflictOptionsResponse(
        options=options,
        rejected=result.get("rejected", []),
        proven_optimal=result.get("proven_optimal"),
        fail_safe=result.get("fail_safe"),
    )


@router.post("/conflicts/{conflict_id}/resolve", response_model=ResolveResponse)
def resolve_conflict_route(
    conflict_id: str, body: ResolveRequest, engine=Depends(get_engine)
) -> ResolveResponse:
    option = dict(body.option)
    if body.edits:
        option.update(body.edits)

    recommendation_id = log_recommendation(
        conflict_id=conflict_id,
        options=[option],
        controller_action=body.controller_action,
        realized_outcome=body.realized_outcome,
        engine=engine,
    )
    return ResolveResponse(status="resolved", recommendation_id=recommendation_id)
