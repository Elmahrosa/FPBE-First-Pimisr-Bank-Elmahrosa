# Build stage
FROM python:3.11-slim AS builder

# Set working directory
WORKDIR /app

# Set environment variables for Python
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install build dependencies and security tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir pip-audit safety

# Copy requirements file
COPY requirements.txt .

# Install dependencies with security checks
RUN pip-audit requirements.txt \
    && pip install --no-cache-dir -r requirements.txt \
    && safety check \
    && rm -rf /root/.cache/pip/*

# Final stage
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    APP_MODULE=app.main:app \
    MAX_WORKERS=4 \
    LOG_LEVEL=info

# Create non-root user
RUN groupadd -r nonroot && \
    useradd -r -g nonroot -s /bin/false -u 10001 nonroot && \
    mkdir -p /app/logs && \
    chown -R nonroot:nonroot /app

# Copy dependencies from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages/ /usr/local/lib/python3.11/site-packages/

# Copy application code
COPY --chown=nonroot:nonroot src/ /app/src/

# Set up health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Set security options
RUN chmod -R 550 /app/src && \
    chmod -R 770 /app/logs

# Switch to non-root user
USER nonroot

# Expose service port
EXPOSE ${PORT}

# Set resource limits
ENV GUNICORN_CMD_ARGS="--workers=${MAX_WORKERS} \
    --worker-class=uvicorn.workers.UvicornWorker \
    --bind=0.0.0.0:${PORT} \
    --timeout=30 \
    --keep-alive=2 \
    --log-level=${LOG_LEVEL} \
    --access-logfile=- \
    --error-logfile=- \
    --capture-output \
    --enable-stdio-inheritance \
    --limit-request-line=8190 \
    --max-requests=10000 \
    --max-requests-jitter=1000 \
    --graceful-timeout=30"

# Start application with Gunicorn
CMD ["gunicorn", "src.app:app"]