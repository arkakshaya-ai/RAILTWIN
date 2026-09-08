"""FastAPI dependency for the SQLAlchemy engine.

Production wiring resolves to the real Postgres engine
(`services.ingestion.udm_writer.build_engine()`, driven by `POSTGRES_URL`);
`tests/test_planning_api.py` overrides this via
`app.dependency_overrides[get_engine] = lambda: <in-memory sqlite engine>`
so the whole API is exercisable without a live Postgres. Cached with
`lru_cache` so the process builds (but does not connect -- SQLAlchemy
engines are lazy) the default engine at most once.
"""
from __future__ import annotations

from functools import lru_cache

from sqlalchemy import Engine

from services.ingestion.udm_writer import build_engine


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    return build_engine()
