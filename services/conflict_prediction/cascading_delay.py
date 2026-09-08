"""Projects a primary delay on one train/division into a downstream division.

Recovery is modelled as a fixed per-division slack budget rather than a
percentage of the delay: real timetables pad each division with a bounded
number of recoverable minutes (turnback margins, crew slack, signal
headroom), not a budget that scales with how late the train already is. A
small delay is mostly absorbed by that budget; a large delay exhausts it and
propagates almost 1:1 beyond that point. That is why the adjusted curve is
concave (proportional recovery for small delays, a flat cap for large ones)
rather than a single constant multiplier.
"""
from __future__ import annotations

DEFAULT_SLACK_BUDGET_MINUTES = 12.0
DEFAULT_RECOVERY_EFFICIENCY = 0.55


def naive_linear_delay(primary_delay_minutes: float) -> float:
    return max(0.0, primary_delay_minutes)


def recovery_adjusted_delay(
    primary_delay_minutes: float,
    slack_budget_minutes: float = DEFAULT_SLACK_BUDGET_MINUTES,
    recovery_efficiency: float = DEFAULT_RECOVERY_EFFICIENCY,
) -> float:
    if primary_delay_minutes <= 0:
        return 0.0
    recoverable = min(primary_delay_minutes * recovery_efficiency, slack_budget_minutes)
    return round(primary_delay_minutes - recoverable, 2)


def project_delay_to_downstream_division(
    primary_delay_minutes: float,
    upstream_division: str = "DIV-1",
    downstream_division: str = "DIV-2",
    slack_budget_minutes: float = DEFAULT_SLACK_BUDGET_MINUTES,
    recovery_efficiency: float = DEFAULT_RECOVERY_EFFICIENCY,
) -> dict:
    naive = naive_linear_delay(primary_delay_minutes)
    adjusted = recovery_adjusted_delay(
        primary_delay_minutes,
        slack_budget_minutes=slack_budget_minutes,
        recovery_efficiency=recovery_efficiency,
    )
    return {
        "upstream_division": upstream_division,
        "downstream_division": downstream_division,
        "primary_delay_minutes": primary_delay_minutes,
        "naive_projected_delay_minutes": naive,
        "recovery_adjusted_delay_minutes": adjusted,
        "recovered_minutes": round(naive - adjusted, 2),
    }
