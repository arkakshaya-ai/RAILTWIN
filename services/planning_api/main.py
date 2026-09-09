"""Phase 4 FastAPI app: `/api/v1` planning/monitoring gateway over the
digital twin and the conflict/priority/block-optimization engines.

Startup wires: (1) `services.scheduling.jobs`'s two apscheduler cron jobs
(weekly block-plan regeneration daily, monthly regeneration weekly) onto a
shared `BackgroundScheduler`, driven off the production engine; (2) one
synchronous AI-engine self-check so `/health` has real data on the very
first request instead of nulls, followed by a repeating interval job for
later checks; (3), when `SEED_DEMO_DATA` is on, a synthetic digital-twin
train convergence so `/conflicts` has something to report in this sandbox
where no producer/consumer is actually running against a broker.

None of this is allowed to crash startup: there is no live Kafka/Postgres in
this sandbox, and train-position/sensor routes must stay usable even if the
DB or scheduler can't come up (Section 7 NFR), so every startup step is
independently caught and logged rather than left to propagate.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from apscheduler.triggers.interval import IntervalTrigger
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.planning_api import health as health_module
from services.planning_api.demo_data import SEED_DEMO_DATA, seed_demo_digital_twin_state
from services.planning_api.deps import get_engine
from services.planning_api.routers import blockplan, conflicts, defects, emergency, evaluation, health, network
from services.scheduling.jobs import start_scheduler

logger = logging.getLogger(__name__)

_scheduler = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _scheduler
    engine = get_engine()

    try:
        from services.ingestion.udm_writer import metadata

        metadata.create_all(engine)
    except Exception as exc:
        logger.warning("startup: metadata.create_all failed (DB unreachable?): %s", exc)

    if SEED_DEMO_DATA:
        try:
            seed_demo_digital_twin_state()
        except Exception as exc:
            logger.warning("startup: demo digital-twin seeding failed: %s", exc)

    health_module.run_self_check()

    try:
        _scheduler = start_scheduler(engine)
        _scheduler.add_job(
            health_module.run_self_check,
            IntervalTrigger(seconds=health_module.SELF_CHECK_INTERVAL_SECONDS),
            id="ai_engine_self_check",
            replace_existing=True,
        )
    except Exception as exc:
        logger.warning("startup: scheduler failed to start: %s", exc)

    yield

    if _scheduler is not None:
        _scheduler.shutdown(wait=False)


app = FastAPI(title="Train Traffic & Block Planning API", lifespan=lifespan)

# dashboard/ (Vite dev server on :5173) calls this API directly from the
# browser, so it needs CORS enabled or every fetch is silently blocked.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(network.router, prefix="/api/v1", tags=["network"])
app.include_router(conflicts.router, prefix="/api/v1", tags=["conflicts"])
app.include_router(defects.router, prefix="/api/v1", tags=["defects"])
app.include_router(blockplan.router, prefix="/api/v1", tags=["blockplan"])
app.include_router(emergency.router, prefix="/api/v1", tags=["emergency"])
app.include_router(evaluation.router, prefix="/api/v1", tags=["evaluation"])
app.include_router(health.router, prefix="/api/v1", tags=["health"])
