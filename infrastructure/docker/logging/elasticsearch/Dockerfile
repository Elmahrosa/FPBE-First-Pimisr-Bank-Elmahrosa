# Stage 1: Configuration builder
FROM alpine:3.18 as builder

# Create required directories
RUN mkdir -p /usr/share/elasticsearch/config/security \
    /usr/share/elasticsearch/config/audit \
    /usr/share/elasticsearch/data \
    && chmod 0750 /usr/share/elasticsearch/config/security

# Copy enhanced elasticsearch.yml configuration
COPY config/elasticsearch.yml /usr/share/elasticsearch/config/
COPY config/security/* /usr/share/elasticsearch/config/security/
COPY config/audit/audit.yml /usr/share/elasticsearch/config/audit/

# Configure secure permissions
RUN chmod 0640 /usr/share/elasticsearch/config/elasticsearch.yml \
    /usr/share/elasticsearch/config/security/* \
    /usr/share/elasticsearch/config/audit/audit.yml

# Stage 2: Final Elasticsearch image
FROM docker.elastic.co/elasticsearch/elasticsearch:8.7.0

LABEL maintainer="FPBE DevOps Team" \
      description="Elasticsearch server with enhanced security for FPBE mobile banking" \
      version="8.7.0"

# Copy configuration from builder stage
COPY --from=builder --chown=elasticsearch:elasticsearch /usr/share/elasticsearch/config /usr/share/elasticsearch/config
COPY --from=builder --chown=elasticsearch:elasticsearch /usr/share/elasticsearch/data /usr/share/elasticsearch/data

# Set environment variables for JVM optimization
ENV ES_JAVA_OPTS="-Xms2g -Xmx2g -XX:+UseG1GC -XX:G1ReservePercent=25 -XX:InitiatingHeapOccupancyPercent=30"
ENV bootstrap.memory_lock=true
ENV cluster.name="fpbe-logging-cluster"
ENV node.name="fpbe-logging-node"
ENV network.host=0.0.0.0
ENV discovery.type=single-node

# Enhanced security settings
ENV xpack.security.enabled=true
ENV xpack.security.transport.ssl.enabled=true
ENV xpack.security.http.ssl.enabled=true
ENV xpack.security.audit.enabled=true

# Monitoring settings
ENV xpack.monitoring.collection.enabled=true
ENV xpack.monitoring.collection.interval=30s

# Data retention settings (30 days)
ENV index.lifecycle.rollover_alias="logs"
ENV index.lifecycle.name="30-day-deletion"

# Thread pool optimization
ENV thread_pool.write.queue_size=1000
ENV thread_pool.search.queue_size=1000

# Expose ports
EXPOSE 9200 9300 9600

# Create required volumes
VOLUME ["/usr/share/elasticsearch/config", "/usr/share/elasticsearch/data", "/usr/share/elasticsearch/config/security"]

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f -k https://localhost:9200/_cluster/health || exit 1

# Set user
USER elasticsearch

# Set entry point and default command
ENTRYPOINT ["tini", "--", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["eswrapper"]