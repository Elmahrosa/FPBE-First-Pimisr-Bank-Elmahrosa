# Stage 1: Configuration builder
FROM alpine:3.18 as builder

# Create necessary directories
RUN mkdir -p /etc/prometheus/rules && \
    mkdir -p /etc/prometheus/certs

# Copy Prometheus configuration
COPY prometheus.yml /etc/prometheus/
COPY rules/*.yml /etc/prometheus/rules/

# Set correct ownership and permissions
RUN chown -R nobody:nogroup /etc/prometheus && \
    chmod -R 755 /etc/prometheus && \
    chmod 644 /etc/prometheus/prometheus.yml && \
    find /etc/prometheus/rules -type f -exec chmod 644 {} \;

# Stage 2: Final Prometheus image
FROM prom/prometheus:v2.45.0

LABEL maintainer="FPBE DevOps Team" \
      description="Prometheus monitoring server for FPBE mobile banking system" \
      version="2.45.0"

# Copy configuration from builder stage
COPY --from=builder --chown=nobody:nogroup /etc/prometheus /etc/prometheus

# Set Prometheus runtime arguments
ENV ARGS="--config.file=/etc/prometheus/prometheus.yml \
    --storage.tsdb.path=/prometheus \
    --storage.tsdb.retention.time=15d \
    --storage.tsdb.retention.size=50GB \
    --web.enable-lifecycle \
    --web.enable-admin-api \
    --storage.tsdb.wal-compression \
    --web.enable-tls \
    --web.certificate-file=/etc/prometheus/certs/server.crt \
    --web.private-key-file=/etc/prometheus/certs/server.key \
    --web.listen-address=0.0.0.0:9090 \
    --web.external-url=https://prometheus.fpbe.com \
    --web.max-connections=512 \
    --query.max-samples=50000000"

# Create and set volume mount points
VOLUME [ "/prometheus", "/etc/prometheus" ]

# Expose Prometheus web interface port
EXPOSE 9090

# Set user to non-root
USER nobody

# Make filesystem read-only
RUN chmod -R 444 /etc/prometheus && \
    chmod -R 444 /prometheus

# Drop all capabilities except those required
RUN setcap cap_net_bind_service=+ep /bin/prometheus

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:9090/-/healthy || exit 1

# Use ENTRYPOINT and CMD combination for better security
ENTRYPOINT [ "/bin/prometheus" ]
CMD [ "--config.file=/etc/prometheus/prometheus.yml" ]