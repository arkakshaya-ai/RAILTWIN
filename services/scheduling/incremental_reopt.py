"""Task 4.1: incremental re-optimization for a single disruption event.

Re-solves only the disrupted train and its downstream dependents, leaving
every other train's legs byte-identical in the output timetable. A
"downstream dependent" is a train that visits a section the disrupted train
also visits, scheduled to arrive there *after* the disrupted train -- it
would be queued behind the delayed train on that shared block section, so
its own schedule is what actually needs re-solving. Trains with no such
shared-section-after relationship to the disrupted train are left untouched.

Delay propagation reuses `cascading_delay.recovery_adjusted_delay` rather
than adding the full primary delay to every dependent 1:1: that module
already models the concave "small delays are mostly absorbed, large ones
propagate almost fully" curve for exactly this kind of downstream projection,
so there is no reason to re-derive a simpler (and less realistic) rule here.
"""
from __future__ import annotations

import copy
from datetime import datetime, timedelta

from services.conflict_prediction.cascading_delay import recovery_adjusted_delay
from services.scheduling.base_timetable import TimetableLeg


def _parse(ts: str) -> datetime:
    return datetime.fromisoformat(ts)


def _shift(ts: str, minutes: float) -> str:
    return (_parse(ts) + timedelta(minutes=minutes)).isoformat()


def _shift_leg(leg: TimetableLeg, minutes: float) -> TimetableLeg:
    if minutes <= 0:
        return leg
    return TimetableLeg(
        section=leg.section,
        scheduled_arrival=_shift(leg.scheduled_arrival, minutes),
        scheduled_departure=_shift(leg.scheduled_departure, minutes),
        priority_class=leg.priority_class,
    )


def find_downstream_dependents(
    timetable: dict[str, list[TimetableLeg]], disrupted_train_id: str
) -> set[str]:
    disrupted_legs = timetable.get(disrupted_train_id, [])
    dependents: set[str] = set()
    for leg in disrupted_legs:
        disrupted_arrival = _parse(leg.scheduled_arrival)
        for train_id, legs in timetable.items():
            if train_id == disrupted_train_id:
                continue
            for other_leg in legs:
                if other_leg.section == leg.section and _parse(other_leg.scheduled_arrival) > disrupted_arrival:
                    dependents.add(train_id)
    return dependents


def reoptimize_for_disruption(
    timetable: dict[str, list[TimetableLeg]],
    disrupted_train_id: str,
    delay_minutes: float,
) -> dict:
    """Returns `{timetable, disrupted_train_id, delay_minutes,
    dependent_train_ids, dependent_delay_minutes}`. `timetable` is a *new*
    dict; trains outside {disrupted_train_id} U dependents are the same
    `TimetableLeg` objects (and therefore `==`-equal) as in the input.
    """
    if disrupted_train_id not in timetable:
        raise KeyError(f"unknown train_id in base timetable: {disrupted_train_id}")

    dependents = find_downstream_dependents(timetable, disrupted_train_id)
    dependent_delay = recovery_adjusted_delay(delay_minutes)

    new_timetable = copy.copy(timetable)
    new_timetable[disrupted_train_id] = [
        _shift_leg(leg, delay_minutes) for leg in timetable[disrupted_train_id]
    ]
    for train_id in dependents:
        new_timetable[train_id] = [_shift_leg(leg, dependent_delay) for leg in timetable[train_id]]

    return {
        "timetable": new_timetable,
        "disrupted_train_id": disrupted_train_id,
        "delay_minutes": delay_minutes,
        "dependent_train_ids": sorted(dependents),
        "dependent_delay_minutes": dependent_delay,
    }
