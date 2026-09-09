# Evaluation: Baseline (Manual/Greedy) vs AI-Optimized Block Planning

This report compares RailTwin's real AI-optimized block planner
(`services/block_optimizer/anytime_wrapper.plan_tasks()`, which wraps the
CP-SAT solver in `services/block_optimizer/solver.py` with the joint-block
preference pass in `services/block_optimizer/joint_block_logic.py`) against
a naive/greedy baseline (`services/evaluation/baseline_simulator.baseline_assign()`,
Task 7.1) that stands in for how a manual, spreadsheet-driven possession
register actually works: tasks are actioned strictly first-come-first-served
by `reported_date`, each claiming the first COA-available slot and taking it
off the table, one task per slot -- no joint-block combination, no
department-capacity balancing, no precedence-awareness, and no ML scoring.

Both planners run over the exact same synthetic input: `seed_demo_defects()`
(24 defects) and `seed_demo_slots()` (140 corridor possession slots across 4
sections over a 5-week horizon), the same fixed-seed generators (seed 42)
every other route in this sandbox scores/plans over. The only deliberate
adjustment is the shared generation anchor (`now`), shifted 20 days into the
past so that a real, non-trivial subset of the synthetic `due_date`s falls
before actual "today" -- with the unmodified default anchor (today = the
generation instant), `due_date` is always generated 3-30 days in the
*future*, so no defect could ever be overdue and the backlog-burndown metric
would be a meaningless 0/0. See `services/evaluation/metrics.py` for the
full rationale and computation; the numbers below are one real, reproducible
run of `compute_evaluation_metrics()` (`services/evaluation/metrics.py`),
not placeholders.

## Run parameters

| | |
|---|---|
| Seed | 42 |
| Tasks | 24 |
| Slots | 140 (4 sections x 7 days x 5 weeks) |
| Overdue tasks (due_date < today) | 12 of 24 |
| Generation anchor (`now`) | 2026-08-20T00:42:28Z (today minus 20 days) |
| Evaluation "today" | 2026-09-09 |

## Results

| Metric | Baseline (Manual/Greedy) | AI-Optimized | Change |
|---|---|---|---|
| Asset downtime (total corridor-closure minutes consumed) | 3745.82 min | 663.24 min | **-82.29%** (reduction) |
| Overdue-backlog burn-down (overdue tasks successfully assigned) | 100.0% (12/12) | 100.0% (12/12) | 0.0 pts (both clear the backlog) |
| Block utilization efficiency (assigned task-time / total available slot-time) | 25.02% | 20.76% | **-17.03%** (lower for AI) |
| Joint-block rate (used slots combining 2+ tasks) | 0.0% (0/24 used slots) | 100.0% (5/5 used slots) | **+100.0 pts** |
| Priority-score coverage (assigned tasks with an ML/severity signal, of all 24) | 100.0% (severity-proxy, no real ML scoring) | 100.0% (true `score_batch()` priority scores) | 0.0 pts (both assign every task) |

Unassigned tasks: baseline 0/24, AI 0/24. AI's `joint_pairs_forced` from
`find_joint_pairs()` was empty on this seeded dataset -- see interpretation
below.

## Interpretation

**Asset downtime reduction (-82.29%).** This is the headline result. The
baseline needs 24 separate corridor closures (one per task, 3745.82 minutes
of total possession time) because it never combines work. The AI solver
closes the corridor only 5 times for the same 24 tasks (663.24 minutes) by
packing every department-eligible task it can into the earliest legal slot
(subject to the 2-per-department concurrency cap), cutting total track
downtime by over four-fifths for identical work completed.

**Overdue-backlog burn-down (tied at 100%).** With 140 slots on offer for
only 24 tasks, this seeded dataset has enough raw slot capacity that even
the naive FIFO baseline eventually places every task somewhere, including
all 12 already-overdue ones -- so both approaches tie on raw completion
coverage here. The AI's real advantage on *this* dataset shows up in the
downtime and joint-block numbers, not in whether the backlog gets cleared:
a smaller or more contested slot pool (fewer weeks, more overlapping COA
windows) would be where FIFO's lack of department-capacity balancing starts
leaving overdue tasks unassigned while the solver still finds room.

**Block utilization efficiency (-17.03%, lower for AI).** This is the one
metric where the AI-optimized plan scores *below* the baseline, and it is a
real, honest finding rather than an artifact: utilization here is defined
as total assigned task-time (each assigned task counted against the full
duration of the slot it occupies) divided by the total possession time
*offered* across the whole 5-week schedule. The baseline spreads its 24
single-task assignments across 24 different slots, so it touches more of
the schedule's total offered time even though each closure serves only one
task. The AI solver's urgency-minimizing objective does the opposite on
purpose -- it deliberately concentrates work into the fewest, earliest legal
slots to minimize overall corridor disruption, so it touches far less of
the schedule's total offered time. In other words: the AI is *not* trying to
maximize how much of the available timetable gets consumed; it is
minimizing total consumption while still finishing the same work, which is
exactly what the downtime metric above rewards. The two metrics are, by
design, in tension for this workload.

**Joint-block rate (0% -> 100%).** Every one of the 5 slots the AI solver
used ended up hosting 2 or more tasks (up to 6 in one slot -- 2 each from
Engineering, S&T and TRD, the configured per-department concurrency cap);
the baseline, by construction, never combines tasks onto one slot, so its
rate is exactly 0%. Worth noting honestly: `joint_block_logic.find_joint_pairs()`
itself found zero *forced* candidate pairs on this seeded dataset (the demo
generator maps each asset to exactly one department, so two different-
department tasks never share the same chainage, which is `find_joint_pairs()`'s
combinability test) -- the observed 100% joint rate comes entirely from
`solver.py`'s own earliness-minimizing CP-SAT objective naturally
co-locating multiple eligible tasks into the same earliest slot, not from
the explicit joint-block forcing pass. The forcing pass exists for the case
where two different departments' work literally sits at the same physical
location; this run demonstrates the solver still consolidates aggressively
even without that trigger.

**Priority-score coverage (tied at 100%, different in kind).** `score_batch()`
(the real XGBoost priority model, Phase 2) scores all 24 tasks regardless of
outcome, and since every task ends up assigned in this run, AI's ML-scored
coverage is 100%. The baseline has no scoring concept at all -- there is no
severity-weighted or ML-informed prioritization anywhere in its FIFO
allocation -- so its 100% figure in the table is a same-denominator proxy
(fraction of all tasks it manages to assign at all) reported for contrast,
not a genuine scoring-coverage number. The meaningful difference is
qualitative, not the tied percentage: every AI assignment carries an
auditable priority score and top-3 feature explanation; no baseline
assignment does.

## Reproducing this report

```
python -c "import json; from services.evaluation.metrics import compute_evaluation_metrics; print(json.dumps(compute_evaluation_metrics(), indent=2))"
```

Also served live at `GET /api/v1/evaluation/blockplan` and rendered in the
dashboard's Feature 5 page ("Before / After: AI-Optimized vs Baseline"
toggle in the Multi-Horizon Output Engine section). Exact figures will drift
slightly run-to-run since `generation_now` is anchored to the real wall
clock (today minus 20 days) rather than a fixed timestamp -- the qualitative
conclusions above (large downtime reduction, a real nonzero AI joint-block
rate against a by-construction-zero baseline, full backlog clearance on this
slot-rich dataset) are stable across runs on the same day.
