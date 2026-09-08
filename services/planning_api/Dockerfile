FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY schemas /app/schemas
# planning_api integrates nearly every service module (digital twin,
# conflict prediction, traffic/block optimizers, priority scoring, failure
# prediction, scheduling, feedback loop, ingestion, producers' reference
# data/pure builders), unlike the narrower producer/ingestion Dockerfiles --
# copying the whole services/ tree is simpler and less failure-prone than
# hand-maintaining that dependency list as Phase 4/6 grow it.
COPY services /app/services

ENV PYTHONPATH=/app

WORKDIR /app

CMD ["uvicorn", "services.planning_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
