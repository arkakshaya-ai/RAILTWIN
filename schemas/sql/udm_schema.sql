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
    overdue             BOOLEAN GENERATED ALWAYS AS (due_date < CURRENT_DATE) STORED,
    department_owner    TEXT NOT NULL CHECK (department_owner IN ('Engineering','S&T','TRD')),
    priority_score      NUMERIC,
    escalation_risk      NUMERIC
);

CREATE TABLE IF NOT EXISTS corridor_block_slot (
    slot_id         TEXT PRIMARY KEY,
    section         TEXT NOT NULL,
    window_start    TIMESTAMP NOT NULL,
    window_end      TIMESTAMP NOT NULL,
    block_type      TEXT NOT NULL CHECK (block_type IN ('line','power','traffic')),
    traffic_density NUMERIC
);

CREATE TABLE IF NOT EXISTS block_plan (
    plan_id         TEXT PRIMARY KEY,
    horizon         TEXT NOT NULL CHECK (horizon IN ('weekly','monthly')),
    slot_id         TEXT REFERENCES corridor_block_slot(slot_id),
    departments     TEXT[] NOT NULL,
    task_ids        TEXT[] NOT NULL,
    generated_at    TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recommendation_log (
    recommendation_id   TEXT PRIMARY KEY,
    conflict_id         TEXT,
    options_json        JSONB NOT NULL,
    scores_json         JSONB NOT NULL,
    controller_action    TEXT,
    realized_outcome    TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT now()
);
