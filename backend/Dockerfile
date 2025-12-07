# syntax=docker/dockerfile:1

FROM python:3.11-slim AS base

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends build-essential curl && rm -rf /var/lib/apt/lists/*

# Install uv for fast installs
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:${PATH}"

# Copy dependency metadata first for better caching
COPY pyproject.toml uv.lock requirements.txt ./

RUN uv pip install --system --no-deps -r requirements.txt
RUN uv pip install --system . --no-deps

# Copy application code
COPY app ./app

EXPOSE 4000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "4000"]
