# Stage 1: Build stage
FROM eclipse-temurin:17-jdk-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache curl bash

# Copy Maven wrapper and POM files first for better layer caching
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./

# Download dependencies in a separate layer
RUN ./mvnw dependency:go-offline -B

# Copy source code
COPY src ./src/

# Build application with layered JAR configuration
RUN ./mvnw clean package -DskipTests \
    && mkdir -p target/extracted \
    && java -Djarmode=layertools -jar target/*.jar extract --destination target/extracted

# Stage 2: Production stage
FROM eclipse-temurin:17-jre-alpine

# Set working directory
WORKDIR /app

# Add non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Install runtime dependencies
RUN apk add --no-cache tzdata wget

# Create necessary directories with proper ownership
RUN mkdir -p /app/logs && \
    chown -R appuser:appgroup /app

# Copy application layers from builder
COPY --from=builder --chown=appuser:appgroup /app/target/extracted/dependencies/ ./
COPY --from=builder --chown=appuser:appgroup /app/target/extracted/spring-boot-loader/ ./
COPY --from=builder --chown=appuser:appgroup /app/target/extracted/snapshot-dependencies/ ./
COPY --from=builder --chown=appuser:appgroup /app/target/extracted/application/ ./

# Set secure file permissions
RUN chmod -R 550 /app && \
    chmod -R 770 /app/logs

# Configure container user
USER appuser

# Set environment variables
ENV SERVER_PORT=8081 \
    SPRING_PROFILES_ACTIVE=prod \
    TZ=UTC \
    JAVA_OPTS="-XX:+UseContainerSupport \
               -XX:MaxRAMPercentage=75.0 \
               -XX:+UseG1GC \
               -XX:+HeapDumpOnOutOfMemoryError \
               -XX:+ExitOnOutOfMemoryError \
               -XX:HeapDumpPath=/app/logs/heapdump.hprof \
               -Djava.security.egd=file:/dev/./urandom \
               -Dfile.encoding=UTF-8"

# Expose service port
EXPOSE 8081

# Configure health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=40s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8081/actuator/health || exit 1

# Set volume for logs and temporary files
VOLUME ["/app/logs", "/tmp"]

# Define entry point
ENTRYPOINT ["java", \
            "org.springframework.boot.loader.JarLauncher"]

# Security labels
LABEL maintainer="FPBE Development Team" \
      version="1.0.0" \
      description="Account Service for FPBE Banking Platform" \
      security.capabilities="cap_net_bind_service=+ep" \
      org.opencontainers.image.source="https://github.com/fpbe/account-service" \
      org.opencontainers.image.vendor="First PIMISR Bank Elmahrosa" \
      org.opencontainers.image.title="Account Service" \
      org.opencontainers.image.description="Account management microservice for FPBE mobile banking platform" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.created="2023-09-21"