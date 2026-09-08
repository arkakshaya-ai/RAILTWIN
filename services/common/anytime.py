"""Shared anytime-solve wrapper used by both traffic_optimizer and block_optimizer.

CP-SAT's own `max_time_in_seconds` is a *soft*, periodically-checked budget —
it bounds the search loop but not model construction, schema validation, or
safety filtering that happens around it. So this module adds a second, hard
wall-clock guard around the whole call: the solve runs in a worker thread and
the caller only ever waits up to `time_budget_seconds + FIXED_OVERHEAD_SECONDS`.
If that expires we stop waiting and hand back a fail-safe response immediately
-- we cannot forcibly kill a Python thread, but the abandoned worker is still
internally bounded by the max_time_in_seconds we gave it, so it exits shortly
after on its own and never blocks the caller.
"""
from __future__ import annotations

import concurrent.futures
import time
from typing import Callable

DEFAULT_TIME_BUDGET_SECONDS = 10.0

# Generous relative to real solve times (our models are small), but tight
# enough that the "tiny budget" acceptance tests still complete in well
# under the 2s bound those tests assert on themselves.
FIXED_OVERHEAD_SECONDS = 1.5

_EXECUTOR: concurrent.futures.ThreadPoolExecutor | None = None


def _executor() -> concurrent.futures.ThreadPoolExecutor:
    global _EXECUTOR
    if _EXECUTOR is None:
        _EXECUTOR = concurrent.futures.ThreadPoolExecutor(
            max_workers=8, thread_name_prefix="anytime-solve"
        )
    return _EXECUTOR


def run_anytime(
    solve_fn: Callable[[float], dict],
    time_budget_seconds: float = DEFAULT_TIME_BUDGET_SECONDS,
) -> dict:
    """Run `solve_fn(budget_seconds)` under a hard time bound.

    `solve_fn` must accept the (possibly clamped) budget in seconds and
    return a dict. It should itself pass that budget to
    `parameters.max_time_in_seconds` on any CP-SAT solver it uses, and set
    `proven_optimal=True` in its result only when every internal solve
    reached OPTIMAL (not just FEASIBLE/time-limit-reached).

    Always returns a dict carrying `fail_safe`, `elapsed_seconds` and
    `time_budget_seconds` -- never raises, never blocks past the hard bound.
    """
    budget = max(float(time_budget_seconds), 0.0)
    wall_clock_cap = budget + FIXED_OVERHEAD_SECONDS
    start = time.monotonic()

    future = _executor().submit(solve_fn, budget)
    timed_out = False
    errored = False
    error_message = None
    try:
        result = future.result(timeout=wall_clock_cap)
    except concurrent.futures.TimeoutError:
        timed_out = True
        result = {}
    except Exception as exc:  # solve_fn itself is untrusted call surface
        errored = True
        error_message = str(exc)
        result = {}

    elapsed = time.monotonic() - start
    if not isinstance(result, dict):
        result = {}

    proven_optimal = bool(result.get("proven_optimal", False))
    # CP-SAT does not artificially slow down a small model just because it
    # was given a tiny max_time_in_seconds -- a trivial problem can still
    # solve to OPTIMAL in a fraction of a millisecond. So "did we honor the
    # caller's budget" has to be judged by measured wall-clock elapsed vs.
    # the budget they actually asked for, not only by the solver's own
    # optimality flag (which alone would let a 1ms budget silently report
    # fail_safe=False just because the problem happened to be easy).
    budget_exceeded = elapsed > budget
    fail_safe = timed_out or errored or not proven_optimal or budget_exceeded

    result["fail_safe"] = fail_safe
    result["elapsed_seconds"] = elapsed
    result["time_budget_seconds"] = time_budget_seconds
    if timed_out:
        result["status"] = "TIMEOUT"
    elif errored:
        result["status"] = "ERROR"
        result["error"] = error_message
    else:
        result.setdefault("status", "OK")
    return result
