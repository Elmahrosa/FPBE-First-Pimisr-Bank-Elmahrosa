# Stage 1: Builder
FROM alpine:3.18 AS builder

# Version and checksum
ARG VAULT_VERSION=1.13.3
ARG VAULT_GPGKEY=C874011F0AB405110D02105534365D9472D7468F

# Install required packages with version pinning
RUN apk add --no-cache \
    ca-certificates=20230506-r0 \
    gnupg=2.4.3-r0 \
    wget=1.21.4-r0 \
    libcap=2.69-r0

# Create Vault directories with secure permissions
RUN mkdir -p /vault/config /vault/data /vault/logs /vault/tls /vault/audit && \
    chmod 0750 /vault && \
    chmod 0600 /vault/config /vault/data /vault/logs /vault/tls /vault/audit

# Download and verify Vault binary
RUN wget https://releases.hashicorp.com/vault/${VAULT_VERSION}/vault_${VAULT_VERSION}_linux_amd64.zip && \
    wget https://releases.hashicorp.com/vault/${VAULT_VERSION}/vault_${VAULT_VERSION}_SHA256SUMS && \
    wget https://releases.hashicorp.com/vault/${VAULT_VERSION}/vault_${VAULT_VERSION}_SHA256SUMS.sig && \
    gpg --keyserver pgp.mit.edu --recv-keys ${VAULT_GPGKEY} && \
    gpg --verify vault_${VAULT_VERSION}_SHA256SUMS.sig vault_${VAULT_VERSION}_SHA256SUMS && \
    sha256sum -c vault_${VAULT_VERSION}_SHA256SUMS 2>&1 | grep -q "${VAULT_VERSION}_linux_amd64.zip: OK"

# Stage 2: Final
FROM vault:1.13.3

# Labels for container metadata
LABEL maintainer="FPBE Security Team" \
      version="${VAULT_VERSION}" \
      description="Secure Vault server for FPBE banking system" \
      security.pci-dss.compliant="true" \
      security.fips140-2.compliant="true"

# Environment variables
ENV VAULT_ADDR=https://0.0.0.0:8200 \
    VAULT_API_ADDR=https://0.0.0.0:8200 \
    VAULT_CLUSTER_ADDR=https://0.0.0.0:8201 \
    VAULT_LOG_LEVEL=info \
    VAULT_TLOG_LEVEL=info \
    VAULT_HSM_MODULE=softhsm2 \
    VAULT_TLS_MIN_VERSION=tls13 \
    VAULT_ENABLE_AUDIT=true

# Create non-root user
RUN addgroup -S vault && \
    adduser -S -G vault vault && \
    chown -R vault:vault /vault

# Security hardening
RUN apk add --no-cache \
    libcap=2.69-r0 \
    su-exec=0.2-r3 \
    tzdata=2023c-r1 && \
    setcap cap_ipc_lock=+ep /usr/local/bin/vault && \
    apk del libcap

# Configure directories and permissions
RUN mkdir -p /vault/config /vault/data /vault/logs /vault/tls /vault/audit && \
    chown -R vault:vault /vault && \
    chmod 0750 /vault && \
    chmod 0600 /vault/config /vault/data /vault/logs /vault/tls /vault/audit

# Copy configuration files
COPY --chown=vault:vault config.hcl /vault/config/
COPY --chown=vault:vault audit.hcl /vault/config/

# Expose ports
EXPOSE 8200 8201 9100

# Volume configuration
VOLUME ["/vault/config", "/vault/data", "/vault/logs", "/vault/tls", "/vault/audit"]

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider https://localhost:8200/v1/sys/health || exit 1

# Security capabilities
RUN setcap cap_ipc_lock=+ep /usr/local/bin/vault

# Set user
USER vault

# Set read-only root filesystem
VOLUME ["/tmp", "/var/run"]

# Resource limits
ENV GOMAXPROCS=2
ENV GOMEMLIMIT=1024MiB

# Entrypoint
ENTRYPOINT ["docker-entrypoint.sh"]

# Default command
CMD ["server", "-config=/vault/config/config.hcl"]

# Security annotations
LABEL org.opencontainers.image.security.fips140-2="level3" \
      org.opencontainers.image.security.pci-dss="compliant" \
      org.opencontainers.image.security.selinux="enforcing"