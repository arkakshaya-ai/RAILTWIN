# BUILD_SPEC.md
## Intelligent Train Traffic Control & Automatic Block Planning Platform
### Current-state build specification for an AI coding agent (Claude Code, Cursor, Copilot Workspace, etc.)

> **How to use this file:** This is not a from-scratch spec — `train-traffic-block-platform`
> is already fully built, tested (99/99 `pytest` passing), and verified live end-to-end
> against a real Kafka broker and PostgreSQL instance. This file documents what exists today,
> the conventions the codebase already follows (match them, don't reinvent), how to actually
> run and generate live data against it, and the specific, prioritized gaps still open. Read
> §8 (conventions) before writing any code, and §11 (open follow-ups) before deciding what to
> work on next — don't re-derive priorities from scratch.

---

## 0. Project Identity

- **Project name:** `train-traffic-block-platform` (repo: `RAILTWIN`)
- **Status:** Working prototype, all phases (0–7) implemented. Verified live against a real
  Kafka 3.7 (KRaft) broker and PostgreSQL 15 in a session with real network/container access —
  see §10 for exactly what that pass covered and what it didn't.
- **Language/runtime:** Python 3.11 for every backend service; TypeScript + React 18 (Vite) for
  the dashboard.
- **Package managers:** `pip` + a venv for Python (`requirements.txt`, pinned); `npm` for
  `dashboard/`.
- **Containerization:** `docker-compose.yml` at repo root — Kafka (KRaft, single broker),
  PostgreSQL, all 5 backend services, and the dashboard, each buildable/runnable with one
  `docker compose up --build`.
- **Repo is a monorepo.** All services live under `services/`, sharing `schemas/`.

---

## 1. Repository Structure (as it exists today)

```
RAILTWIN/
├── README.md                       Setup, run instructions, demo script, known simplifications
├── BUILD_SPEC.md                   This file
├── docker-compose.yml
├── .env.example
├── requirements.txt                 Pinned backend deps
├── conftest.py
├── schemas/
│   ├── avro/                       One .avsc per Kafka topic (12 files, §5)
│   └── sql/udm_schema.sql          Postgres UDM DDL (§6) — also run via metadata.create_all
├── services/
│   ├── producers/                  5 synthetic data producers + shared kafka_utils.py/reference_data.py
│   ├── ingestion/                  schema_validator.py, dead_letter_handler.py, udm_writer.py
│   ├── digital_twin/               state_store.py, weather_store.py, api.py — in-memory fused state
│   ├── conflict_prediction/        fast_tier.py, cascading_delay.py, fast_tier_fallback.py
│   ├── priority_scoring/           train_model.py (XGBoost training), score.py (serving)
│   ├── failure_prediction/         escalation_model.py (Cox survival, logistic fallback)
│   ├── traffic_optimizer/          solver.py (CP-SAT), safety_validation.py, anytime_wrapper.py
│   ├── block_optimizer/            solver.py (CP-SAT), joint_block_logic.py, anytime_wrapper.py
│   ├── common/anytime.py           Shared time-budget/fail-safe wrapper both optimizers use
│   ├── scheduling/                 base_timetable.py, incremental_reopt.py, jobs.py (apscheduler cron)
│   ├── planning_api/               FastAPI gateway
│   │   ├── main.py                 App + lifespan startup wiring (§4)
│   │   ├── live_feed.py            Planning API's own Kafka consumer for live digital-twin state (§4)
│   │   ├── demo_data.py            SEED_DEMO_DATA fixed-seed dataset (fallback only, not the live path)
│   │   ├── deps.py, health.py, train_enrichment.py, models.py
│   │   └── routers/                network, conflicts, defects, blockplan, emergency, evaluation, health
│   ├── feedback_loop/logger.py     Writes recommendation_log (DB + best-effort Kafka)
│   └── evaluation/                 baseline_simulator.py (naive/greedy), metrics.py (before/after)
├── dashboard/                      React/Vite/TS frontend (RailTwin UI), src/pages/Feature{1..8}.tsx
├── tests/                          pytest suite, one file per phase/module, 99 tests total
└── docs/evaluation_metrics.md      Computed baseline-vs-AI numbers
```

Nothing here is a placeholder — every directory has real, tested code.

---

## 2. Tech Stack — Pinned Versions (`requirements.txt`)

| Layer | Library | Version |
|---|---|---|
| Kafka client | `confluent-kafka` | 2.5.3 |
| Schema validation | `fastavro` | 1.12.2 |
| DB access | `sqlalchemy` / `psycopg[binary]` | 2.0.35 / 3.2.3 |
| ML — priority scoring | `xgboost` | 3.2.0 |
| ML — escalation risk | `scikit-survival` (+ `scikit-learn`) | 0.28.0 / 1.9.0 |
| Optimization | `ortools` | 9.15.6755 |
| API | `fastapi` / `uvicorn[standard]` | 0.115.5 / 0.32.1 |
| Cron jobs | `apscheduler` | 3.10.4 |
| Testing | `pytest` / `httpx` | 8.3.3 / 0.27.2 |
| Event streaming (infra) | Apache Kafka, KRaft mode | `confluentinc/cp-kafka:7.6.0` in Compose |
| Relational DB (infra) | PostgreSQL | `postgres:15` in Compose |
| Frontend | React 18 + Vite + TypeScript | see `dashboard/package.json` |

Do not upgrade or swap any of these without a stated reason — every module was built and tested
against exactly these versions.

---

## 3. Architecture

```
producers (Kafka)  ──topics(§5)──▶  udm_writer.py (ingestion, its own consumer group)
  train/sensor/                          │
  defect/corridor/                       ├──▶ Postgres UDM (asset, defect_task,
  weather                                │      corridor_block_slot, block_plan,
                                          │      recommendation_log)
                                          └──▶ (writes into its OWN process's digital_twin_api —
                                               irrelevant once split into containers, see below)

producers (Kafka)  ──topics(§5)──▶  planning_api's live_feed.py (its OWN consumer group)
  train/sensor/weather                   │
                                          └──▶ digital_twin_api + weather_store
                                               (THIS process's in-memory state — what every
                                               router below actually reads)

conflict_prediction / priority_scoring /
failure_prediction (AI layer, reads digital twin + UDM)
        │
traffic_optimizer / block_optimizer (OR-Tools CP-SAT,
anytime/fail-safe budgeted, §8)
        │
        ▼
planning_api (FastAPI, /api/v1/*, §7)
        │
        ▼
dashboard (React/Vite, RailTwin UI)
```

**Why there are two independent consumers of the same train/sensor/weather topics** (this is
the single most important architectural fact in this codebase — get it wrong and "live
tracking" silently stops working): `docker-compose.yml` runs `udm_writer` and `planning_api`
as **separate containers**, each with its own Python-process-local `digital_twin_api` /
`weather_store` singleton (`services/digital_twin/api.py`, `services/digital_twin/weather_store.py`
— plain module-level objects, no cross-process IPC). `udm_writer.py` feeding train/sensor
events into *its own* copy of that singleton does nothing useful once it's a separate process
from `planning_api` — nobody reads it. `services/planning_api/live_feed.py` is what makes
`GET /api/v1/network/state` actually live: it's `planning_api`'s own confluent-kafka consumer,
its own consumer group (`planning-api-live-feed`, independent of `udm_writer`'s `udm-writer`
group — Kafka fans a topic out to every distinct consumer group), subscribed only to
`train.position.v1` / `sensor.axle.v1` / `sensor.hotbox.v1` / `weather.v1`, polled from a
daemon thread started in `main.py`'s `lifespan`. It never raises out of `start()` — a broker
that's down just leaves the thread idling, exactly like every other startup step in `main.py`.

If you add a new topic that a router needs to read live, decide up front which process needs
it and wire a consumer into *that* process — don't assume `udm_writer` consuming it is enough.

---

## 4. Kafka Topics — Contract (unchanged from original design; do not rename/remove fields)

1 partition, 1 replica (dev). Schemas: `schemas/avro/*.avsc`, one per topic, validated on both
produce (`services/producers/kafka_utils.py::publish`) and consume
(`services/ingestion/schema_validator.py::validate_message`).

| Topic | Producer | Key fields |
|---|---|---|
| `train.position.v1` | `train_position_producer.py` | `train_id, timestamp, section, chainage_km, speed_kmph, direction` |
| `sensor.axle.v1` | `sensor_producer.py` | `sensor_id, chainage_km, occupancy_state, timestamp` |
| `sensor.hotbox.v1` | `sensor_producer.py` | `sensor_id, chainage_km, temperature_c, threshold_breach, timestamp` |
| `defect.tms.v1` / `defect.smms.v1` / `defect.tdms.v1` | `defect_producer.py` | `defect_id, asset_id, category, severity, reported_date, due_date, department_owner` |
| `corridor.availability.v1` | `corridor_timetable_producer.py` | `section, window_start, window_end, block_type` |
| `timetable.v1` | `corridor_timetable_producer.py` | `train_id, section, scheduled_arrival, scheduled_departure, priority_class` |
| `goods.forecast.v1` | `corridor_timetable_producer.py` | `section, date, expected_goods_traffic_density` |
| `weather.v1` | `weather_producer.py` | `section, condition, severity, speed_restriction_kmph, timestamp` |
| `recommendation.log.v1` | `feedback_loop/logger.py` | `recommendation_id, conflict_id, options[], scores[], controller_action, realized_outcome` |
| `block.plan.v1` | *(schema exists; nothing publishes to it yet — see §11)* | `plan_id, horizon, assigned_tasks[], slot, departments[]` |

A malformed message on any topic is routed to `<topic>.dlq` by
`services/ingestion/dead_letter_handler.py`, never silently dropped.

---

## 5. Unified Data Model — `schemas/sql/udm_schema.sql` (current, fixed)

```sql
CREATE TABLE IF NOT EXISTS asset (
    asset_id        TEXT PRIMARY KEY,
    asset_type      TEXT NOT NULL CHECK (asset_type IN ('track','signal','ohe')),
    section         TEXT NOT NULL,
    chainage_km     NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS defect_task (
    defect_id           TEXT PRIMARY KEY,
    asset_id            TEXT REFERENCES asset(asset_id),
    source_system       TEXT NOT NULL CHECK (source_system IN ('TMS','SMMS','TDMS')),
    category            TEXT NOT NULL,
    severity            INT NOT NULL CHECK (severity BETWEEN 1 AND 5),
    reported_date       DATE NOT NULL,
    due_date            DATE NOT NULL,
    overdue             BOOLEAN,          -- plain column; derived at read time (not GENERATED —
                                           -- Postgres rejects CURRENT_DATE in a generated expr)
    department_owner    TEXT NOT NULL CHECK (department_owner IN ('Engineering','S&T','TRD')),
    priority_score      NUMERIC,
    escalation_risk     NUMERIC
);

CREATE TABLE IF NOT EXISTS corridor_block_slot (
    slot_id         TEXT PRIMARY KEY,
    section         TEXT NOT NULL,
    window_start    TEXT NOT NULL,        -- TEXT not TIMESTAMP: every reader parses via
    window_end      TEXT NOT NULL,        -- datetime.fromisoformat(), never relies on SQL
                                           -- timestamp semantics; see udm_writer.py's Text column
    block_type      TEXT NOT NULL CHECK (block_type IN ('line','power','traffic')),
    traffic_density NUMERIC
);

CREATE TABLE IF NOT EXISTS block_plan (
    plan_id         TEXT PRIMARY KEY,
    horizon         TEXT NOT NULL CHECK (horizon IN ('weekly','monthly')),
    slot_id         TEXT REFERENCES corridor_block_slot(slot_id),
    departments     TEXT[] NOT NULL,
    task_ids        TEXT[] NOT NULL,
    generated_at    TEXT NOT NULL          -- TEXT, same reasoning; app always supplies it
);

CREATE TABLE IF NOT EXISTS recommendation_log (
    recommendation_id   TEXT PRIMARY KEY,
    conflict_id         TEXT,
    options_json        JSONB NOT NULL,
    scores_json         JSONB NOT NULL,
    controller_action    TEXT,
    realized_outcome    TEXT,
    created_at          TEXT NOT NULL
);
```

`services/ingestion/udm_writer.py` defines the matching SQLAlchemy `Table` objects (source of
truth for column *types* the app actually binds — keep this file and the DDL in lockstep; every
past mismatch between them broke a real Postgres write, see §10).

---

## 6. Planning API — Route Contract (current, includes one addition beyond the original design)

All under `/api/v1`, implemented in `services/planning_api/routers/`, Pydantic models in `models.py`.

| Method | Route | Purpose | Notes |
|---|---|---|---|
| GET | `/network/state` | Live digital twin snapshot | `{trains, sensors, blocks}`; live via `live_feed.py` |
| GET | `/conflicts` | Predicted conflicts | `{conflicts: [{id, section, eta, severity}]}` |
| GET | `/conflicts/{id}/options` | Ranked resolution options | Safety-filtered; `rejected` list shows why a candidate was cut |
| POST | `/conflicts/{id}/resolve` | Commit controller's choice | `{option, edits?, controller_action, realized_outcome?}` → writes `recommendation_log` (DB + best-effort Kafka) |
| GET | `/defects` | Live-scored defect list | DB-first (`defect_task`), demo-fallback only if empty; persists `priority_score` back |
| GET | `/blockplan/weekly` / `/blockplan/monthly` | Current plan for that horizon | DB-first (`block_plan`), on-demand-solve fallback; `source` field says which |
| POST | `/emergency/trigger` | Simulate an infra failure | `{section, description}` → one joint traffic+block re-optimization |
| GET | `/evaluation/blockplan` | Baseline-vs-AI metrics | Phase 7 addition, not in the original spec |
| GET | `/health` | AI-engine heartbeat | Drives the dashboard's fallback banner |

**Pattern to follow for any new read route that has a live DB source:** DB-first with a
documented fallback, exactly like `routers/blockplan.py` and `routers/defects.py` — try the
live table, fall back to `demo_data.py`'s fixed-seed generators only when the DB read fails or
returns nothing, and never let the fallback path silently mask a real deployment never having
live data. This is not a request to introduce it elsewhere without a live table already
existing to point it at.

---

## 7. Conventions this codebase already follows — match them

- **Why-comments only, and only when non-obvious.** Every comment in this codebase explains a
  hidden constraint or a bug it's guarding against, not what the code does. Match that density,
  not more, not less.
- **Pure logic separated from I/O wiring.** `UdmWriter.handle()` / `route_message()` /
  `score_batch()` / `plan_tasks()` are plain dict-in/dict-out functions, independently
  unit-testable without a broker or DB; `main()`/`start()` functions are thin wiring around them
  that construct the real `confluent_kafka.Consumer`/SQLAlchemy `Engine`. Keep new logic on the
  testable side of that line.
- **Anytime/fail-safe wrapper for both optimizers** (`services/common/anytime.py`, used by both
  `traffic_optimizer/anytime_wrapper.py` and `block_optimizer/anytime_wrapper.py`): every CP-SAT
  call has a time budget; exceeding it returns best-so-far with `fail_safe=true`, never an
  exception or a hang. Any new optimization call must go through this, not call OR-Tools
  directly.
- **Never let one bad event kill a consumer loop.** `udm_writer.py`'s `main()` wraps
  `writer.handle(...)` in a broad `except Exception: log and continue` — a single malformed row
  or transient DB error must not stop ingestion for every other topic. Any new long-running
  consumer loop (including a future one you add) must follow this.
- **A background service must never crash app startup.** Every step in `main.py`'s `lifespan`
  (DB metadata, demo seeding, `live_feed` start, scheduler start) is independently
  try/excepted and logged. Section 7's NFR requires the digital twin + dashboard to stay live
  even if Kafka/Postgres/the AI engine are down.
- **DDL types must match what SQLAlchemy actually binds.** See §5's `TEXT` columns — if you add
  a new column the app writes as a Python string, don't reach for `TIMESTAMP`/`DATE` in the DDL
  unless the app also writes a native `datetime`/`date` object. SQLite (used in tests) does not
  catch this; only a real Postgres run does (see §10).
- **Foreign keys must actually be satisfiable on both the live and fallback code path.** See how
  `scheduling/jobs.py::_persist_plans` upserts every referenced slot before inserting a
  `block_plan` row — the demo-fallback slots were never persisted anywhere else, so without
  that upsert the FK into `corridor_block_slot` fails on a real Postgres (again, invisible in
  SQLite tests).

---

## 8. How to Simulate Data in the Prototype

Three ways to run this, in order of fidelity. All three exercise the exact same code paths.

### 8.1 Full stack via Docker Compose (closest to a real deployment)

```bash
cp .env.example .env
docker compose up --build          # Kafka, Postgres, all 5 backend services, dashboard

# second terminal, if you want the dashboard's dev server instead of its built container:
cd dashboard && npm install && npm run dev   # http://localhost:5173
```

`planning_api` listens on `http://localhost:8000`. Producers start immediately and publish on
their own cadence (train positions every 5s, sensors on `--interval-seconds`, defects sparsely,
corridor/timetable once at startup, weather every few minutes) — no extra step needed to "start
the simulation," it's running the moment the containers are up.

### 8.2 Native multi-process (no Docker) — what this repo's live-tracking fixes were verified with

Useful when Docker/registry access is unavailable (as it was in the sandbox that produced this
file's fixes) or when you want to see each service's logs separately. Requires a JRE (Kafka) and
Postgres installed locally instead of in containers — everything else is identical to Docker.

```bash
# Kafka (KRaft, single node) — download once:
curl -L -o kafka.tgz https://archive.apache.org/dist/kafka/3.7.1/kafka_2.13-3.7.1.tgz
tar xzf kafka.tgz && cd kafka_2.13-3.7.1
CLUSTER_ID=$(bin/kafka-storage.sh random-uuid)
cp config/kraft/server.properties /tmp/kafka-server.properties
bin/kafka-storage.sh format -t "$CLUSTER_ID" -c /tmp/kafka-server.properties
bin/kafka-server-start.sh /tmp/kafka-server.properties &

# create the 12 topics from §5 (repeat --create per topic, or script it)
bin/kafka-topics.sh --bootstrap-server localhost:9092 --create --topic train.position.v1 --partitions 1 --replication-factor 1
# ...repeat for the other 11 topics

# Postgres (apt or your OS package manager)
sudo service postgresql start
psql -c "CREATE USER traindb WITH PASSWORD 'traindb';"
psql -c "CREATE DATABASE traindb OWNER traindb;"
PGPASSWORD=traindb psql -h localhost -U traindb -d traindb -f schemas/sql/udm_schema.sql

# backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
export KAFKA_BOOTSTRAP_SERVERS=localhost:9092
export POSTGRES_URL="postgresql+psycopg://traindb:traindb@localhost:5432/traindb"

# producers — each is its own long-running process; run as many as you want live
python services/producers/train_position_producer.py --num-trains 10          # every 5s
python services/producers/sensor_producer.py --fault-rate 0.1                 # --fault-rate: fraction of hot-box reads with threshold_breach=true
python services/producers/weather_producer.py
python services/producers/defect_producer.py --min-interval-seconds 5 --max-interval-seconds 20
python services/producers/corridor_timetable_producer.py

# ingestion (separate process — this is what proves the live_feed.py fix matters:
# planning_api below gets live data WITHOUT sharing memory with this process)
python services/ingestion/udm_writer.py

# API, with SEED_DEMO_DATA=false to see ONLY live Kafka-sourced data, no synthetic seed
export SEED_DEMO_DATA=false
uvicorn services.planning_api.main:app --host 0.0.0.0 --port 8000

# dashboard
cd dashboard && npm install && VITE_API_BASE_URL=http://localhost:8000/api/v1 npm run dev
```

Verify it's genuinely live, not seeded:
```bash
curl -s localhost:8000/api/v1/network/state | python -m json.tool   # note a train's chainage_km
sleep 6
curl -s localhost:8000/api/v1/network/state | python -m json.tool   # same train_id, chainage_km has moved
```

### 8.3 No-broker demo (fastest, not "live" Kafka data)

```bash
pip install -r requirements.txt
SEED_DEMO_DATA=true uvicorn services.planning_api.main:app --reload   # SEED_DEMO_DATA defaults true
```

Seeds a small fixed-seed dataset (2 converging trains, a fog reading, 24 defects, 5 weeks of
corridor slots) directly into the in-memory stores so every route has real data with zero
external infra. This is what CI/tests effectively run — no Kafka or Postgres involved at all
(SQLite in-memory for tests specifically).

### 8.4 Individual producer flags, for scripting specific scenarios

| Producer | Flag | Effect |
|---|---|---|
| `train_position_producer.py` | `--num-trains N` (default 10) | Fleet size |
| | `--interval-seconds S` | Publish cadence |
| `sensor_producer.py` | `--fault-rate F` (default 0.05) | Fraction of hot-box reads with `threshold_breach=true` |
| `weather_producer.py` | `--seed N` | Reproducible weather sequence |
| `defect_producer.py` | `--min/max-interval-seconds` | How sparse defect events are |
| `corridor_timetable_producer.py` | `--seed N` | Reproducible slot/timetable/forecast schedule |

To watch raw topic traffic directly (Docker or native): `kafka-console-consumer.sh
--bootstrap-server localhost:9092 --topic train.position.v1 --from-beginning`.

---

## 9. Testing

```bash
pip install -r requirements.txt
pytest tests/ -q          # 99 passed, ~13s, no external infra required
```

Every module has dependency-injected test doubles (in-memory `StateStore`/`WeatherStore`,
SQLite via `StaticPool`, mocked Kafka producers) — the suite never needs a real broker or DB.
Real-infra behavior (this file's §10) is validated separately, manually, against a real broker.

---

## 10. What Has and Hasn't Been Verified Against Real Infrastructure

**Verified live**, in a session with real Kafka/Postgres access (native Apache Kafka 3.7 KRaft +
PostgreSQL 15, not containers — registry access to pull the exact `confluentinc/cp-kafka:7.6.0`
/ `postgres:15` images was unavailable in that sandbox, but the wiring exercised is identical):
producers → Kafka → `udm_writer` → Postgres; producers → Kafka → `planning_api`'s own
`live_feed.py` → digital twin/weather store → REST API, confirmed genuinely live (a train's
`chainage_km` observed advancing over real time from a process that never seeded that data);
`POST /conflicts/{id}/resolve` → `recommendation_log` (DB + Kafka); both weekly and monthly
block-plan scheduler jobs against live `defect_task`/`corridor_block_slot` rows; `GET /defects`
reading and scoring live rows; the dashboard rendering all of the above.

**Not yet verified**:
- `docker compose up` itself, pulling the actual pinned container images — the equivalent native
  services were verified instead (see above). Low risk (nothing found was image-specific), but
  someone with Docker registry access should still run it once before calling this "confirmed."
- Section 7's NFR latency targets (fast-tier ≤2s, deep optimization ≤10–15s, weekly resolve ≤few
  minutes, monthly ≤10–15 minutes) under genuinely concurrent multi-producer load. The
  anytime/fail-safe wrapper itself is unit-tested (a 1ms budget always returns `fail_safe=true`,
  never hangs), but real latency under load has not been measured.
- The dashboard's Material Symbols icon glyphs rendered as literal text (e.g. "speed",
  "verified") in one headless screenshot taken from a network-restricted sandbox — plausibly a
  font-loading timing/CDN-access artifact of that specific sandbox rather than a code bug (the
  Google Fonts CSS endpoint itself was reachable), but not confirmed fixed in a normal browser.

---

## 11. Open Follow-Ups, Prioritized

1. **Confirm `docker compose up` end-to-end with real registry access** — highest-value next
   check given §10's caveat; if anything image-specific breaks, fix it there rather than in the
   native-equivalent path.
2. **Investigate the dashboard icon-glyph rendering** in a normal (non-sandboxed) browser; if it
   reproduces, check whether `Material Symbols Outlined` is actually resolving as a font at the
   CSS level vs. a build/bundling issue.
3. **`block.plan.v1` has a schema but no producer.** Nothing publishes to it — decide whether
   `block_optimizer/solver.py` (or `scheduling/jobs.py` after a successful solve) should, per the
   original topic contract, or whether to formally retire the topic if the DB row is sufficient.
4. **NFR latency load test** (§10) — script concurrent producers at realistic volume and measure
   against Section 7's targets for real.
5. **Persistent conflict cache.** `GET /conflicts` results live in a module-level dict, not
   Postgres — IDs don't survive a restart or (per the code's own comment) even a second call in
   some paths. Low urgency for a prototype, but worth a real store before this goes past demo
   stage.
6. **Real timetable-driven `priority_class`/crew data.** `services/planning_api/train_enrichment.py`
   currently derives both deterministically from a train ID's numeric suffix, documented in-code
   as a stand-in — `timetable.v1` already carries `priority_class` but nothing consumes it yet.
7. **ML models are still trained on synthetic labeled data** (`priority_scoring`,
   `failure_prediction`) — fine for demonstrating the pipeline, not for real-world-calibrated
   scores. Swapping in real historical data is a training-data problem, not a code problem; the
   serving path (`score.py`, `escalation_model.py`) doesn't need to change.

---

## 12. Definition of Done (current)

- [x] All Phase 0–7 acceptance criteria pass (`pytest tests/ -q` → 99 passed).
- [x] Digital twin and weather store are genuinely live across the `udm_writer`/`planning_api`
      process split, verified against a real broker.
- [x] `README.md` documents setup, run instructions, demo script, and known simplifications.
- [x] `docs/evaluation_metrics.md` contains computed before/after numbers.
- [ ] `docker compose up` verified against the exact pinned container images (§11.1).
- [ ] Section 7 NFR latency targets measured under real concurrent load (§11.4).
