FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY schemas /app/schemas
COPY services/ingestion /app/services/ingestion
COPY services/digital_twin /app/services/digital_twin
COPY services/producers/reference_data.py /app/services/producers/reference_data.py

ENV PYTHONPATH=/app

WORKDIR /app/services/ingestion
