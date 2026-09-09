# train-traffic-block-platform

An intelligent train traffic control and automatic block-planning prototype: a
Kafka-fed digital twin of a rail corridor, an AI layer that predicts
conflicts and scores maintenance priority/escalation risk, two OR-Tools
CP-SAT optimizers (traffic conflict resolution and maintenance block
planning), a FastAPI gateway, and a React dashboard (a port of the RailTwin
design) that drives and displays all of it live.

This is a working prototype end to end, not a mockup — a reviewer can bring
up the stack, watch synthetic train/sensor/defect/weather data flow through
Kafka into Postgres and the digital twin, see conflicts get predicted and
resolved, trigger an emergency, and compare an AI-optimized block plan
against a naive baseline, all from the running dashboard.

## Architecture

```
producers (Kafka)  ──topics──▶  ingestion (schema validation + DLQ)
  train/sensor/                       │
  defect/corridor/                    ├──▶ digital twin (in-memory, live)
  weather                             └──▶ Postgres UDM (asset, defect_task,
                                            corridor_block_slot, block_plan,
                                            recommendation_log)
                                                   │
conflict_prediction / priority_scoring /           │
failure_prediction (AI layer, reads digital twin    │
+ UDM) ─────────────────────────────────────────────┤
                                                     │
traffic_optimizer / block_optimizer (OR-Tools        │
CP-SAT, anytime/fail-safe budgeted) ─────────────────┤
                                                     ▼
                                        planning_api (FastAPI, /api/v1/*)
                                                     │
                                                     ▼
                                        dashboard (React/Vite, RailTwin UI)
```

Every service under `services/` is plain Python; the frontend is under
`dashboard/`. `schemas/` holds the Avro topic contracts and the Postgres DDL
that every phase was built against without deviation.

## Repository layout

```
schemas/avro/            Avro schemas for every Kafka topic
schemas/sql/              udm_schema.sql — the Postgres UDM DDL
services/producers/       5 synthetic data producers (fixed-seed, realistic)
services/ingestion/       schema validation, DLQ routing, UDM writer
services/digital_twin/    in-memory fused network + weather state
services/conflict_prediction/   fast-tier lookahead + cascading delay + fallback
services/priority_scoring/      XGBoost defect priority model
services/failure_prediction/    survival/logistic escalation-risk model
services/traffic_optimizer/     CP-SAT conflict resolution + safety validation
services/block_optimizer/       CP-SAT block planning + joint-block logic
services/common/          shared anytime/fail-safe timeout wrapper
services/scheduling/      base timetable, incremental re-opt, cron jobs
services/planning_api/    FastAPI gateway implementing every /api/v1 route,
                          plus live_feed.py's own Kafka consumer keeping this
                          process's digital twin/weather store live
services/feedback_loop/   recommendation logging (DB + Kafka)
services/evaluation/      baseline simulator + before/after metrics
dashboard/                React/Vite/TS frontend (RailTwin UI, live-wired)
tests/                    pytest suite (backend)
docs/evaluation_metrics.md   computed baseline-vs-AI numbers
```

## Prerequisites

- Docker + Docker Compose (for Kafka and Postgres)
- Python 3.11
- Node.js 22 + npm

## Setup and run

```bash
cp .env.example .env

# 1. Bring up Kafka + Postgres + every backend service
docker compose up --build

# 2. In a second terminal, install and run the dashboard
cd dashboard
npm install
npm run dev   # http://localhost:5173
```

`planning_api` listens on `http://localhost:8000`; the dashboard's dev
server (`http://localhost:5173`) is CORS-allowed to call it directly. Set
`VITE_API_BASE_URL` in `dashboard/.env` to point elsewhere if needed.

### Running without Docker (backend only)

Every backend module was built and tested to run without a live
Kafka/Postgres, so you can also just:

```bash
pip install -r requirements.txt
SEED_DEMO_DATA=true uvicorn services.planning_api.main:app --reload
```

`SEED_DEMO_DATA` (default `true`) seeds a small fixed-seed synthetic dataset
(trains, a scripted conflict, defects, corridor slots, a heavy-fog weather
reading) directly into the digital twin / in-memory stores so every route
has real data to serve even with no producers or database running. Set it
to `false` once you have producers and `udm_writer.py` running against a
real Postgres instance.

### Tests

```bash
pip install -r requirements.txt
pytest tests/ -q
```

## Demo script

1. **Normal operation** — with the stack up, open the dashboard. The Home
   page's quick-stats and telemetry dock, and Feature 1's live kinematics
   console, reflect `GET /api/v1/network/state` and `GET /api/v1/health`.
2. **Injected conflict** — Feature 2/3 show the currently predicted conflict
   (`GET /api/v1/conflicts`) and its ranked resolution options
   (`GET /api/v1/conflicts/{id}/options`), safety-filtered and scored live.
3. **Explainability drill-down** — Feature 7's controller review console:
   pick the live conflict, see each option's rationale and
   `constraints_checked`, and Authorize/Modify/Reject to call
   `POST /api/v1/conflicts/{id}/resolve` — the response's
   `recommendation_id` is written to the `recommendation_log` table and
   best-effort published to `recommendation.log.v1`.
4. **Injected emergency** — Feature 6's trigger buttons call
   `POST /api/v1/emergency/trigger`, which finds affected conflicts and
   block tasks for the given section and runs one combined
   traffic+block re-optimization within a shared time budget.
5. **Block-plan before/after** — Feature 5's before/after toggle compares
   the AI-optimized block plan against a naive greedy baseline on identical
   synthetic input; see `docs/evaluation_metrics.md` for the computed
   numbers behind it.

## Known simplifications

Stated upfront, not left for a reviewer to discover:

- **Interlocking/signaling is simplified.** `fast_tier.py`'s conflict
  lookahead is straight-line kinematics (hold each train's last-seen speed
  and direction constant) — it does not model a real interlocking/signal
  finite-state machine, points, or block-section locking logic. This is
  intentionally conservative (false positives are cheaper than missed
  conflicts for a fast tier) but is not a real interlocking simulation.
- **ML models are trained on synthetic labeled data.** `priority_scoring`
  (XGBoost) and `failure_prediction` (Cox proportional-hazards survival
  model, with a documented logistic-regression fallback) are trained on
  fixed-seed synthetic data with an invented, documented feature/label
  relationship — not on real historical maintenance or failure outcomes.
  They demonstrate the modeling approach and pipeline, not calibrated
  real-world risk.
- **Train priority class and crew duty are synthetic stand-ins.**
  `services/planning_api/train_enrichment.py` deterministically derives
  `priority_class` and `crew_duty_minutes` from a train's numeric ID suffix
  because no real timetable-join or crew-roster feed exists yet — documented
  in-code as a stand-in meant to be replaced wholesale, not extended.
- **The conflict cache is in-memory and single-process.** `GET
  /api/v1/conflicts` results are cached in a module-level dict keyed by the
  predicted conflict's id, valid only until the next `/conflicts` call —
  there's no persistent conflict store yet, so IDs don't survive a restart
  or a second call.
- **Verified end-to-end against a real Kafka broker and Postgres** (native
  Apache Kafka 3.7 in KRaft mode + PostgreSQL 15, not just this repo's own
  test doubles) in a session with real container/network access — every
  producer, `udm_writer.py`'s live consumer loop, `planning_api`'s own live
  feed (below), the conflict-resolve → `recommendation_log` write, and both
  scheduled block-plan jobs were run for real, not just unit-tested. That
  pass caught and fixed several bugs this sandbox's earlier "no docker
  daemon" constraint had let ship silently:
  - `defect_task.overdue` was a `GENERATED ALWAYS AS (... CURRENT_DATE)
    STORED` column — Postgres rejects `CURRENT_DATE` there (not immutable),
    so `schemas/sql/udm_schema.sql` failed to apply at all. It's now a plain
    column; `overdue` is derived at read time everywhere it's used, which is
    what the app already did.
  - `corridor_block_slot.window_start`/`window_end` and
    `block_plan.generated_at`/`recommendation_log.created_at` were declared
    `TIMESTAMP` in the DDL but every writer sends them as ISO-8601 strings
    through `Text`-typed SQLAlchemy columns — a real Postgres rejects the
    bind with a `DatatypeMismatch`. The first one crashed `udm_writer.py`'s
    whole consumer loop (no live corridor/train/defect ingestion after
    that) the moment a real `corridor.availability.v1` message arrived; the
    second broke the scheduled block-plan jobs; the third broke
    `POST /conflicts/{id}/resolve`. All three columns are now `TEXT`,
    matching what the code already wrote.
  - `udm_writer.py`'s consumer loop had no exception guard around
    `writer.handle(...)`: one bad row (any of the above, or a future schema
    edge case) took the entire ingestion process down, silently stopping
    ingestion for every topic. It now logs and keeps polling.
  - **The digital twin and weather store were never actually live once
    `udm_writer` and `planning_api` run as separate containers** (exactly
    what `docker-compose.yml` does): `udm_writer.py` fed its *own*
    process-local `digital_twin_api`/`weather_store` singleton, which
    `planning_api`'s routes never see. `services/planning_api/live_feed.py`
    is the fix — `planning_api` now runs its own Kafka consumer (its own
    consumer group, so both processes get every message) feeding its own
    in-memory stores, started from `main.py`'s startup and never allowed to
    crash it. This was the core gap between "the code is written for Kafka"
    and "live tracking actually works once deployed" — confirmed by
    running producers, `udm_writer`, and `planning_api` as three separate
    OS processes against one real broker and watching `GET
    /api/v1/network/state` track a train's `chainage_km` advance in real
    time from a process that never seeded or touched that data itself.
  - `run_weekly_block_plan_job`/`run_monthly_block_plan_job`
    (`services/scheduling/jobs.py`) always solved over `seed_demo_defects`/
    `seed_demo_slots`, never live `defect_task`/`corridor_block_slot` rows —
    so the scheduled cron jobs were never actually live, and on top of that
    would `IntegrityError` on a real deployment the moment `block_plan`'s
    foreign key to `corridor_block_slot` was enforced (SQLite, used in
    tests, never enforces it, so this shipped unnoticed). Both jobs now
    read live rows with the same DB-first/demo-fallback pattern
    `routers/blockplan.py` already used, and `_persist_plans` upserts every
    referenced slot first so the fallback path satisfies the constraint too.
  - `GET /api/v1/defects` always returned `[]` outside of
    `SEED_DEMO_DATA=true` — it never read `defect_task` at all. It now
    reads live rows, scores them, and writes `priority_score` back, falling
    back to the demo batch only when the DB has no rows yet.

  `docker compose up`'s exact image versions (`confluentinc/cp-kafka:7.6.0`,
  `postgres:15`) were not themselves pulled in that session (registry access
  was to a native Kafka/Postgres install, not those containers) — the wiring
  above is what changed, not anything Docker-image-specific, so this is a
  low-risk gap rather than an unverified one.
- **Emergency re-optimization is bounded to one conflict.** `POST
  /api/v1/emergency/trigger` resolves the single most-severe conflict on
  the affected section (not every predicted conflict) to keep the joint
  re-optimization inside a fixed time budget regardless of disruption size.
- **NFR latency targets are unverified under real concurrent load.** The
  anytime/fail-safe timeout wrapper is tested directly (a 1ms budget always
  returns `fail_safe=true` within bounds, never hangs), but Section 7's
  fast-tier/deep-optimization latency targets under concurrent producer
  load require a live multi-service deployment to measure for real, which
  this sandbox could not run.
