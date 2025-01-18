# Stage 1: Configuration builder with Alpine
# docker.elastic.co/logstash/logstash:8.7.0
FROM alpine:3.18 AS builder

# Create necessary directories with secure permissions
RUN mkdir -p /config /pipeline /certs && \
    chmod 750 /config /pipeline /certs

# Copy configuration files
COPY config/logstash.yml /config/
COPY config/pipelines.yml /config/
COPY config/log4j2.properties /config/
COPY pipeline/*.conf /pipeline/

# Set secure file permissions
RUN chmod 640 /config/* /pipeline/* && \
    chown -R 1000:1000 /config /pipeline /certs

# Stage 2: Final Logstash image with security configurations
FROM docker.elastic.co/logstash/logstash:8.7.0

LABEL maintainer="FPBE DevOps Team" \
      description="Secure Logstash instance for FPBE mobile banking system" \
      version="8.7.0" \
      security.features="TLS1.3,MutualTLS,DataEncryption"

# Set security-enhanced environment variables
ENV LS_JAVA_OPTS="-Xms1g -Xmx1g -Dlog4j2.formatMsgNoLookups=true -Djavax.net.ssl.trustStore=/usr/share/logstash/certs/truststore.jks" \
    XPACK_MONITORING_ENABLED=true \
    PIPELINE_WORKERS=2 \
    PATH_CONFIG=/usr/share/logstash/config/logstash.yml \
    PATH_DEAD_LETTER_QUEUE=/usr/share/logstash/data/dead_letter_queue \
    PIPELINE_UNSAFE_SHUTDOWN=false \
    PIPELINE_BATCH_SIZE=125 \
    PIPELINE_BATCH_DELAY=50 \
    CONFIG_RELOAD_AUTOMATIC=true \
    HTTP_HOST=0.0.0.0 \
    XPACK_MONITORING_ELASTICSEARCH_SSL_VERIFICATION_MODE=certificate \
    XPACK_SECURITY_ENABLED=true

# Copy secure configurations from builder stage
COPY --from=builder --chown=logstash:root /config/* /usr/share/logstash/config/
COPY --from=builder --chown=logstash:root /pipeline/* /usr/share/logstash/pipeline/

# Create necessary directories with secure permissions
RUN mkdir -p /usr/share/logstash/data/dead_letter_queue && \
    mkdir -p /usr/share/logstash/certs && \
    chown -R logstash:root /usr/share/logstash/data && \
    chmod -R 750 /usr/share/logstash/data && \
    chmod -R 750 /usr/share/logstash/certs

# Add security hardening configurations
RUN echo "path.data: /usr/share/logstash/data" >> /usr/share/logstash/config/logstash.yml && \
    echo "path.logs: /usr/share/logstash/logs" >> /usr/share/logstash/config/logstash.yml && \
    echo "xpack.monitoring.elasticsearch.ssl.certificate_authority: /usr/share/logstash/certs/ca.crt" >> /usr/share/logstash/config/logstash.yml && \
    echo "xpack.monitoring.elasticsearch.ssl.truststore.path: /usr/share/logstash/certs/truststore.jks" >> /usr/share/logstash/config/logstash.yml

# Set resource limits
RUN ulimit -n 65535 && \
    sysctl -w vm.max_map_count=262144 || true

# Expose ports with TLS encryption
EXPOSE 5044/tcp 9600/tcp 8080/tcp

# Define volumes for persistent data and certificates
VOLUME ["/usr/share/logstash/data", "/usr/share/logstash/certs"]

# Set healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:9600/_node/stats || exit 1

# Run as non-root user
USER logstash

# Start Logstash with security options
CMD ["/usr/share/logstash/bin/logstash", \
     "--config.reload.automatic", \
     "--log.level=info", \
     "--config.debug", \
     "--path.settings=/usr/share/logstash/config"]