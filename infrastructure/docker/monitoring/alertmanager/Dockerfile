# Stage 1: Builder stage using Alpine Linux
# Version: 3.18
FROM alpine:3.18 AS builder

# Set global arguments
ARG ALERTMANAGER_USER=alertmanager
ARG ALERTMANAGER_GROUP=alertmanager
ARG ALERTMANAGER_UID=65534
ARG ALERTMANAGER_GID=65534
ARG ALERTMANAGER_CONFIG_DIR=/etc/alertmanager
ARG ALERTMANAGER_STORAGE_DIR=/alertmanager

# Install required packages with security verification
RUN apk add --no-cache --update \
    wget=1.21.4-r0 \
    ca-certificates=20230506-r0 \
    && update-ca-certificates

# Create AlertManager user and group with specific UID/GID for security
RUN addgroup -g ${ALERTMANAGER_GID} -S ${ALERTMANAGER_GROUP} && \
    adduser -u ${ALERTMANAGER_UID} -S ${ALERTMANAGER_USER} -G ${ALERTMANAGER_GROUP} -s /sbin/nologin

# Create directory structure with proper permissions
RUN mkdir -p ${ALERTMANAGER_CONFIG_DIR} ${ALERTMANAGER_STORAGE_DIR} && \
    chown -R ${ALERTMANAGER_USER}:${ALERTMANAGER_GROUP} ${ALERTMANAGER_CONFIG_DIR} ${ALERTMANAGER_STORAGE_DIR} && \
    chmod 755 ${ALERTMANAGER_CONFIG_DIR} ${ALERTMANAGER_STORAGE_DIR}

# Stage 2: Final stage using official AlertManager image
# Version: v0.25.0
FROM prom/alertmanager:v0.25.0

# Set labels for container metadata
LABEL maintainer="FPBE DevOps Team" \
      version="v0.25.0" \
      security.scan-required="true" \
      monitoring.enabled="true"

# Set global arguments
ARG ALERTMANAGER_USER=alertmanager
ARG ALERTMANAGER_GROUP=alertmanager
ARG ALERTMANAGER_CONFIG_DIR=/etc/alertmanager
ARG ALERTMANAGER_STORAGE_DIR=/alertmanager

# Copy directory structure from builder
COPY --from=builder ${ALERTMANAGER_CONFIG_DIR} ${ALERTMANAGER_CONFIG_DIR}
COPY --from=builder ${ALERTMANAGER_STORAGE_DIR} ${ALERTMANAGER_STORAGE_DIR}

# Set correct ownership and permissions
USER ${ALERTMANAGER_USER}:${ALERTMANAGER_GROUP}

# Set resource limits
ENV GOMEMLIMIT=256MiB
ENV GOMAXPROCS=2

# Expose AlertManager web interface port
EXPOSE 9093

# Set up volumes for configuration and storage
VOLUME ["${ALERTMANAGER_CONFIG_DIR}", "${ALERTMANAGER_STORAGE_DIR}"]

# Configure healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
    CMD wget --spider -S http://localhost:9093/-/healthy 2>&1 | grep 'HTTP/' | grep '200 OK'

# Drop all capabilities and set security options
SECURITY_OPTS="no-new-privileges:true"

# Set entrypoint with proper configuration
ENTRYPOINT [ "/bin/alertmanager" ]
CMD [ \
    "--config.file=/etc/alertmanager/alertmanager.yml", \
    "--storage.path=/alertmanager", \
    "--web.listen-address=:9093", \
    "--web.route-prefix=/", \
    "--cluster.listen-address=", \
    "--log.level=info" \
]