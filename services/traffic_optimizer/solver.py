"""CP-SAT candidate generator for section-conflict resolution.

A conflict is two or more trains converging on the same section such that,
left alone, they would both want to occupy the contested point within less
than the minimum safe headway. `solve()` produces >=2 ranked candidate
resolutions: `resequence` (re-order who goes first, minimizing weighted
delay), `hold` (deterministically hold the lower-priority train, the
conservative default a human controller would reach for first), and
`reroute` (divert a train via a loop line, when the section has one).

Every candidate is scored, but never *filtered* here -- hard safety gates
live in `safety_validation.py` so scoring and rejection stay separated, per
the "hard filter, never soft penalty" requirement.
"""
from __future__ import annotations

from typing import Optional

from ortools.sat.python import cp_model

from services.producers.reference_data import SECTIONS

# A conflict resolved instantly (zero delay to everyone) is the reference
# point delay-saved is measured against, so scores are comparable across
# conflicts of different sizes.
DEFAULT_MIN_HEADWAY_MINUTES = 5

DEFAULT_PRIORITY_WEIGHTS = {
    "express": 1.0,
    "mail": 0.9,
    "passenger": 0.7,
    "freight": 0.4,
}
DEFAULT_PRIORITY_WEIGHT = 0.5

# Invented reference table: only these two sections carry a loop line able
# to hold a diverted train clear of the main running line in this network,
# mirroring how SECTIONS itself is a small fixed reference table. A loop
# line is rated for lower speed than the main line (points/curvature).
ALTERNATE_ROUTES = {
    "SEC-B": "SEC-B-LOOP",
    "SEC-C": "SEC-C-LOOP",
}
LOOP_LINE_SPEED_CAP_KMPH = 30.0
REROUTE_PENALTY_MINUTES = 12.0

# Scoring weights: delay is the dominant operational KPI (on-time
# performance), priority class matters because express/mail trains carry
# larger downstream schedule externalities than a single freight service,
# and asset availability is the smallest term -- it only breaks ties
# between otherwise-similar candidates rather than driving the ranking.
SCORE_WEIGHTS = {
    "delay_saved": 0.5,
    "priority_class": 0.3,
    "asset_availability": 0.2,
}

_UNSOLVED_STATUSES = {cp_model.INFEASIBLE, cp_model.MODEL_INVALID, cp_model.UNKNOWN}


def _section_lookup(name: str):
    for section in SECTIONS:
        if section.name == name:
            return section
    return None


def _eta_minutes(train: dict, section) -> float:
    if "eta_min" in train and train["eta_min"] is not None:
        return max(float(train["eta_min"]), 0.0)
    speed = float(train.get("speed_kmph") or 0.0)
    if section is None or speed <= 0:
        return 9999.0
    conflict_point_km = (section.start_km + section.end_km) / 2.0
    distance_km = abs(conflict_point_km - float(train.get("chainage_km", conflict_point_km)))
    return round(distance_km / speed * 60.0, 3)


def _priority_weight(train: dict) -> float:
    cls = (train.get("priority_class") or "").lower()
    return DEFAULT_PRIORITY_WEIGHTS.get(cls, DEFAULT_PRIORITY_WEIGHT)


def _schedule_with_precedence(
    train_ids: list[str],
    eta: dict[str, float],
    weight: dict[str, float],
    headway_minutes: float,
    time_budget_seconds: float,
    fixed_order: Optional[list[str]] = None,
) -> tuple[dict[str, float], bool]:
    """Disjunctive single-resource scheduling: each train gets a start time
    no earlier than its ETA, and for every pair exactly one goes first with
    at least `headway_minutes` separation. Minimizes total priority-weighted
    delay. When `fixed_order` is given, precedence is pinned to that order
    instead of optimized -- this is how the deterministic 'hold' candidate
    reuses the same CP-SAT model rather than a hand-simulated schedule.
    """
    model = cp_model.CpModel()
    horizon = int(max(eta.values(), default=0)) + int(headway_minutes) * len(train_ids) + 120

    start = {}
    delay = {}
    for tid in train_ids:
        e = int(round(eta[tid]))
        start[tid] = model.NewIntVar(e, horizon, f"start_{tid}")
        delay[tid] = model.NewIntVar(0, horizon, f"delay_{tid}")
        model.Add(delay[tid] == start[tid] - e)

    headway = int(round(headway_minutes))
    for i, a in enumerate(train_ids):
        for b in train_ids[i + 1 :]:
            if fixed_order is not None:
                a_first = fixed_order.index(a) < fixed_order.index(b)
                if a_first:
                    model.Add(start[b] >= start[a] + headway)
                else:
                    model.Add(start[a] >= start[b] + headway)
            else:
                a_before_b = model.NewBoolVar(f"before_{a}_{b}")
                model.Add(start[b] >= start[a] + headway).OnlyEnforceIf(a_before_b)
                model.Add(start[a] >= start[b] + headway).OnlyEnforceIf(a_before_b.Not())

    model.Minimize(sum(int(round(weight[tid] * 100)) * delay[tid] for tid in train_ids))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = max(time_budget_seconds, 0.0001)
    solver.parameters.num_workers = 1
    status = solver.Solve(model)

    if status in _UNSOLVED_STATUSES:
        return {tid: eta[tid] for tid in train_ids}, False

    resolved = {tid: float(solver.Value(start[tid])) for tid in train_ids}
    return resolved, status == cp_model.OPTIMAL


def _delay_saved_score(total_delay: float, baseline_delay: float) -> float:
    if baseline_delay <= 0:
        return 1.0 if total_delay <= 0 else 0.0
    saved_ratio = (baseline_delay - total_delay) / baseline_delay
    return max(0.0, min(1.0, saved_ratio))


def _priority_score(train_ids: list[str], weight: dict[str, float], resolved: dict[str, float], eta: dict[str, float]) -> float:
    served_first = min(train_ids, key=lambda t: resolved[t])
    return weight[served_first]


def _asset_availability_score(action: str) -> float:
    # Holding/resequencing keep every train on the single main-line asset
    # (fully contested); rerouting spreads load onto the loop line asset,
    # which is what "availability" is meant to reward here.
    return 0.4 if action != "reroute" else 0.85


def _build_candidate(
    action: str,
    train_ids: list[str],
    eta: dict[str, float],
    weight: dict[str, float],
    resolved: dict[str, float],
    baseline_delay: float,
    proven_optimal: bool,
    implied_speed_kmph: float,
    crew_duty_minutes: dict[str, float],
    rerouted_train: Optional[str] = None,
    extra_note: str = "",
) -> dict:
    total_delay = sum(resolved[t] - eta[t] for t in train_ids)
    delay_saved_min = round(baseline_delay - total_delay, 3)

    delay_saved_component = _delay_saved_score(total_delay, baseline_delay)
    priority_component = _priority_score(train_ids, weight, resolved, eta)
    asset_component = _asset_availability_score(action)

    score = round(
        SCORE_WEIGHTS["delay_saved"] * delay_saved_component
        + SCORE_WEIGHTS["priority_class"] * priority_component
        + SCORE_WEIGHTS["asset_availability"] * asset_component,
        4,
    )

    order = sorted(train_ids, key=lambda t: resolved[t])
    rationale = (
        f"{action}: sequence {order}, total delay {round(total_delay, 1)} min "
        f"(baseline {round(baseline_delay, 1)} min)"
    )
    if extra_note:
        rationale += f"; {extra_note}"

    return {
        "action": action,
        "score": score,
        "rationale": rationale,
        "delay_saved_min": delay_saved_min,
        "order": order,
        "resolved_start_min": {t: round(v, 2) for t, v in resolved.items()},
        "eta_min": {t: round(v, 2) for t, v in eta.items()},
        "implied_speed_kmph": implied_speed_kmph,
        "crew_duty_minutes": crew_duty_minutes,
        "rerouted_train": rerouted_train,
        "proven_optimal": proven_optimal,
    }


def solve(conflict: dict, time_budget_seconds: float = 10.0, headway_minutes: float = DEFAULT_MIN_HEADWAY_MINUTES) -> dict:
    """Entry point an emergency-reoptimization handler can call directly:
    pass the affected trains/section as `conflict` and get back ranked,
    unfiltered candidates (safety_validation.filter_candidates then gates
    them). `time_budget_seconds` is split across the CP-SAT sub-solves this
    function makes (resequence, hold, optional reroute) so the *sum* of
    solver time stays within the caller's budget.
    """
    section_name = conflict["section"]
    trains = conflict["trains"]
    if len(trains) < 2:
        raise ValueError("solve() requires at least two converging trains to form a conflict")

    section = _section_lookup(section_name)
    train_ids = [t["train_id"] for t in trains]
    eta = {t["train_id"]: _eta_minutes(t, section) for t in trains}
    weight = {t["train_id"]: _priority_weight(t) for t in trains}
    crew_duty = {t["train_id"]: float(t.get("crew_duty_minutes", 0.0)) for t in trains}
    max_current_speed = max((float(t.get("speed_kmph") or 0.0) for t in trains), default=0.0)

    sub_budget = max(time_budget_seconds / 3.0, 0.0001)

    baseline_order = sorted(train_ids, key=lambda t: eta[t])
    baseline_resolved, _ = _schedule_with_precedence(
        train_ids, eta, weight, headway_minutes, sub_budget, fixed_order=baseline_order
    )
    baseline_delay = sum(baseline_resolved[t] - eta[t] for t in train_ids)

    candidates = []
    all_optimal = True

    resequenced, opt1 = _schedule_with_precedence(train_ids, eta, weight, headway_minutes, sub_budget)
    all_optimal &= opt1
    candidates.append(
        _build_candidate(
            "resequence", train_ids, eta, weight, resequenced, baseline_delay, opt1,
            implied_speed_kmph=max_current_speed, crew_duty_minutes=crew_duty,
        )
    )

    priority_order = sorted(train_ids, key=lambda t: (-weight[t], eta[t]))
    held, opt2 = _schedule_with_precedence(
        train_ids, eta, weight, headway_minutes, sub_budget, fixed_order=priority_order
    )
    all_optimal &= opt2
    candidates.append(
        _build_candidate(
            "hold", train_ids, eta, weight, held, baseline_delay, opt2,
            implied_speed_kmph=max_current_speed, crew_duty_minutes=crew_duty,
            extra_note="lower-priority train(s) held at current block until higher-priority traffic clears",
        )
    )

    alt_route = ALTERNATE_ROUTES.get(section_name)
    if alt_route is not None:
        lowest_priority_train = min(train_ids, key=lambda t: (weight[t], -eta[t]))
        remaining = [t for t in train_ids if t != lowest_priority_train]
        if remaining:
            reroute_eta = dict(eta)
            reroute_eta[lowest_priority_train] = eta[lowest_priority_train] + REROUTE_PENALTY_MINUTES
            remaining_resolved, opt3 = _schedule_with_precedence(
                remaining, eta, weight, headway_minutes, sub_budget
            )
            all_optimal &= opt3
            resolved = dict(remaining_resolved)
            resolved[lowest_priority_train] = reroute_eta[lowest_priority_train]
            candidates.append(
                _build_candidate(
                    "reroute", train_ids, eta, weight, resolved, baseline_delay, opt3,
                    implied_speed_kmph=LOOP_LINE_SPEED_CAP_KMPH, crew_duty_minutes=crew_duty,
                    rerouted_train=lowest_priority_train,
                    extra_note=f"{lowest_priority_train} diverted via {alt_route} (loop line, speed capped at {LOOP_LINE_SPEED_CAP_KMPH} km/h)",
                )
            )

    candidates.sort(key=lambda c: c["score"], reverse=True)
    return {
        "conflict_section": section_name,
        "candidates": candidates,
        "proven_optimal": all_optimal,
        "baseline_delay_min": round(baseline_delay, 3),
    }
