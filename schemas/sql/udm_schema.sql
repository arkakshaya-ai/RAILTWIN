-- Unified Data Model schema. Applied automatically by the postgres container's
-- docker-entrypoint-initdb.d mechanism on first boot, and by services/ingestion/udm_writer.py
-- for local (non-docker) runs via SQLAlchemy.

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
    -- Not a GENERATED column: Postgres rejects CURRENT_DATE in a generated
    -- expression ("generation expression is not immutable"), which broke
    -- schema init against a real Postgres. `overdue` is instead derived at
    -- read time wherever it's needed (see services/evaluation/metrics.py,
    -- services/priority_scoring/score.py), matching what the app already did.
    overdue             BOOLEAN,
    department_owner    TEXT NOT NULL CHECK (department_owner IN ('Engineering','S&T','TRD')),
    priority_score      NUMERIC,
    escalation_risk      NUMERIC
);

CREATE TABLE IF NOT EXISTS corridor_block_slot (
    slot_id         TEXT PRIMARY KEY,
    section         TEXT NOT NULL,
    -- TEXT, not TIMESTAMP: every reader (services/block_optimizer/solver.py,
    -- services/evaluation/*.py) treats these as raw ISO-8601 strings via
    -- datetime.fromisoformat() and never relies on Postgres timestamp
    -- semantics; services/ingestion/udm_writer.py's SQLAlchemy Table already
    -- binds them as Text, and inserting a plain JSON string into a TIMESTAMP
    -- column raises "column is of type timestamp ... but expression is of
    -- type character varying" the first time a real corridor.availability.v1
    -- message is written, killing the udm_writer consumer loop.
    window_start    TEXT NOT NULL,
    window_end      TEXT NOT NULL,
    block_type      TEXT NOT NULL CHECK (block_type IN ('line','power','traffic')),
    traffic_density NUMERIC
);

CREATE TABLE IF NOT EXISTS block_plan (
    plan_id         TEXT PRIMARY KEY,
    horizon         TEXT NOT NULL CHECK (horizon IN ('weekly','monthly')),
    slot_id         TEXT REFERENCES corridor_block_slot(slot_id),
    departments     TEXT[] NOT NULL,
    task_ids        TEXT[] NOT NULL,
    -- TEXT, not TIMESTAMP -- same reasoning as corridor_block_slot above:
    -- services/scheduling/jobs.py writes `datetime.now(timezone.utc).isoformat()`
    -- through udm_writer.py's Text-typed SQLAlchemy column, and a TIMESTAMP
    -- column here rejects that string bind exactly like window_start/window_end did.
    generated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recommendation_log (
    recommendation_id   TEXT PRIMARY KEY,
    conflict_id         TEXT,
    options_json        JSONB NOT NULL,
    scores_json         JSONB NOT NULL,
    controller_action    TEXT,
    realized_outcome    TEXT,
    -- TEXT, not TIMESTAMP -- services/feedback_loop/logger.py writes
    -- `datetime.now(timezone.utc).isoformat()` through the same Text-typed
    -- SQLAlchemy column pattern; see corridor_block_slot's comment above.
    created_at          TEXT NOT NULL
);
