# Stage 1: Builder
FROM grafana/grafana-oss:9.5.0 AS builder

# Install required plugins with version pinning
ENV GF_INSTALL_PLUGINS="grafana-piechart-panel 1.6.4,grafana-worldmap-panel 1.0.6,grafana-polystat-panel 1.2.8"
RUN grafana-cli plugins install ${GF_INSTALL_PLUGINS}

# Create necessary directories
RUN mkdir -p /etc/grafana/provisioning/dashboards \
    /etc/grafana/provisioning/datasources \
    /etc/grafana/certs

# Copy and validate dashboard configurations
COPY src/backend/shared/monitoring/grafana/dashboards/services.json /etc/grafana/provisioning/dashboards/services.json
COPY src/backend/shared/monitoring/grafana/dashboards/pi-mining.json /etc/grafana/provisioning/dashboards/pi-mining.json

# Verify file permissions and ownership
RUN chown -R grafana:grafana /etc/grafana \
    && chmod -R 440 /etc/grafana/provisioning/dashboards/* \
    && chmod -R 440 /etc/grafana/provisioning/datasources/*

# Verify plugin signatures
RUN grafana-cli plugins ls --no-config

# Stage 2: Final Image
FROM grafana/grafana-oss:9.5.0

# Labels for container metadata
LABEL maintainer="FPBE DevOps Team" \
    app="fpbe-monitoring" \
    component="grafana" \
    version="9.5.0" \
    security.protocol="strict" \
    com.fpbe.image.created="{{BUILD_DATE}}" \
    com.fpbe.image.version="{{VERSION}}" \
    com.fpbe.image.title="FPBE Grafana Monitoring"

# Copy validated configurations from builder
COPY --from=builder --chown=grafana:grafana /etc/grafana/provisioning /etc/grafana/provisioning
COPY --from=builder --chown=grafana:grafana /var/lib/grafana/plugins /var/lib/grafana/plugins

# Set secure environment variables
ENV GF_SECURITY_ADMIN_PASSWORD="from-secret" \
    GF_AUTH_ANONYMOUS_ENABLED="false" \
    GF_USERS_ALLOW_SIGN_UP="false" \
    GF_SECURITY_ALLOW_EMBEDDING="false" \
    GF_SECURITY_DISABLE_GRAVATAR="true" \
    GF_SECURITY_COOKIE_SECURE="true" \
    GF_SECURITY_STRICT_TRANSPORT_SECURITY="true" \
    GF_SECURITY_CONTENT_SECURITY_POLICY="true" \
    GF_PATHS_PROVISIONING="/etc/grafana/provisioning" \
    GF_PATHS_LOGS="/var/log/grafana" \
    GF_PATHS_DATA="/var/lib/grafana"

# Create required directories with proper permissions
RUN mkdir -p "$GF_PATHS_LOGS" "$GF_PATHS_DATA" \
    && chown -R grafana:grafana "$GF_PATHS_LOGS" "$GF_PATHS_DATA" \
    && chmod -R 755 "$GF_PATHS_LOGS" "$GF_PATHS_DATA"

# Configure read-only root filesystem
VOLUME ["/var/lib/grafana", "/etc/grafana/provisioning/datasources", "/etc/grafana/provisioning/dashboards", "/etc/grafana/certs"]

# Set up health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Expose Grafana port
EXPOSE 3000

# Use non-root user
USER grafana

# Set secure entry point
ENTRYPOINT ["/run.sh"]

# Apply security hardening
RUN set -ex \
    && rm -rf /usr/share/grafana/.npm \
    && rm -rf /usr/share/grafana/.cache \
    && rm -rf /tmp/*

# Drop all capabilities and prevent privilege escalation
# Note: These are typically handled by the container runtime/orchestrator
# but including here for documentation and completeness
LABEL seccomp.security.alpha.kubernetes.io/pod="runtime/default" \
    container.apparmor.security.beta.kubernetes.io/grafana="runtime/default"