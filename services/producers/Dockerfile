FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY schemas /app/schemas
COPY services/producers /app/services/producers
COPY services/ingestion/schema_validator.py /app/services/ingestion/schema_validator.py

ENV PYTHONPATH=/app

WORKDIR /app/services/producers
