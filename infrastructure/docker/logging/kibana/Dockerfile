# Build stage for configuration preparation
FROM alpine:3.18 AS builder

# Create configuration directories with proper permissions
RUN mkdir -p /usr/share/kibana/config/certs && \
    mkdir -p /usr/share/kibana/config/oidc && \
    chmod 755 /usr/share/kibana/config

# Copy enhanced Kibana configuration with security settings
COPY config/kibana.yml /usr/share/kibana/config/
COPY config/certs/* /usr/share/kibana/config/certs/
COPY config/oidc/* /usr/share/kibana/config/oidc/

# Set proper permissions for Kibana user
RUN chown -R 1000:1000 /usr/share/kibana/config && \
    chmod 600 /usr/share/kibana/config/certs/* && \
    chmod 600 /usr/share/kibana/config/oidc/*

# Final stage with Kibana server
FROM docker.elastic.co/kibana/kibana:8.7.0

# Set environment variables for optimization
ENV NODE_OPTIONS="--max-old-space-size=1024" \
    MONITORING_ENABLED="true" \
    SECURITY_ENABLED="true" \
    LOGGING_DEST="/var/log/kibana/kibana.log" \
    LOGGING_ROTATE_SIZE="100mb" \
    LOGGING_ROTATE_INTERVAL="daily"

# Copy secured configuration from builder stage
COPY --from=builder --chown=1000:1000 /usr/share/kibana/config /usr/share/kibana/config

# Create logging directory with proper permissions
RUN mkdir -p /var/log/kibana && \
    chown -R 1000:1000 /var/log/kibana

# Add custom configuration for security and performance
RUN echo "xpack.security.enabled: true" >> /usr/share/kibana/config/kibana.yml && \
    echo "xpack.security.encryptionKey: ${KIBANA_ENCRYPTION_KEY:?}" >> /usr/share/kibana/config/kibana.yml && \
    echo "xpack.reporting.encryptionKey: ${REPORTING_ENCRYPTION_KEY:?}" >> /usr/share/kibana/config/kibana.yml && \
    echo "xpack.encryptedSavedObjects.encryptionKey: ${SAVED_OBJECTS_ENCRYPTION_KEY:?}" >> /usr/share/kibana/config/kibana.yml && \
    echo "server.ssl.enabled: true" >> /usr/share/kibana/config/kibana.yml && \
    echo "server.ssl.certificate: /usr/share/kibana/config/certs/kibana.crt" >> /usr/share/kibana/config/kibana.yml && \
    echo "server.ssl.key: /usr/share/kibana/config/certs/kibana.key" >> /usr/share/kibana/config/kibana.yml && \
    echo "server.ssl.certificateAuthorities: [ /usr/share/kibana/config/certs/ca.crt ]" >> /usr/share/kibana/config/kibana.yml

# Configure secure connection to Elasticsearch
RUN echo "elasticsearch.ssl.certificateAuthorities: [ /usr/share/kibana/config/certs/ca.crt ]" >> /usr/share/kibana/config/kibana.yml && \
    echo "elasticsearch.ssl.verificationMode: full" >> /usr/share/kibana/config/kibana.yml

# Configure monitoring and health checks
RUN echo "monitoring.ui.container.elasticsearch.enabled: true" >> /usr/share/kibana/config/kibana.yml && \
    echo "monitoring.ui.container.logstash.enabled: true" >> /usr/share/kibana/config/kibana.yml && \
    echo "status.allowAnonymous: false" >> /usr/share/kibana/config/kibana.yml

# Configure CORS for API access
RUN echo "server.cors.enabled: true" >> /usr/share/kibana/config/kibana.yml && \
    echo "server.cors.allowCredentials: false" >> /usr/share/kibana/config/kibana.yml && \
    echo 'server.cors.allowOrigin: ["https://*.fpbe-bank.com"]' >> /usr/share/kibana/config/kibana.yml

# Set resource limits
RUN echo "ops.interval: 5000" >> /usr/share/kibana/config/kibana.yml && \
    echo "cpu.cgroup.path.override: /" >> /usr/share/kibana/config/kibana.yml && \
    echo "cpuacct.cgroup.path.override: /" >> /usr/share/kibana/config/kibana.yml

# Enable caching strategies
RUN echo "optimize.useBundleCache: true" >> /usr/share/kibana/config/kibana.yml && \
    echo "optimize.watch: false" >> /usr/share/kibana/config/kibana.yml

# Expose Kibana port
EXPOSE 5601

# Define volumes for persistence
VOLUME ["/usr/share/kibana/config", "/usr/share/kibana/data", "/var/log/kibana"]

# Set health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f https://localhost:5601/api/status -k || exit 1

# Use non-root user
USER 1000

# Start Kibana
CMD ["/usr/local/bin/kibana-docker"]