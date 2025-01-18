# Stage 1: Build stage
FROM maven:3.9-eclipse-temurin-17 AS builder

# Set working directory
WORKDIR /build

# Copy pom.xml for dependency resolution
COPY pom.xml .

# Download dependencies with parallel threads
RUN mvn dependency:go-offline -B -T 4

# Copy source code (respect .dockerignore)
COPY src ./src

# Build application with production profile
RUN mvn clean package -DskipTests -P production \
    && mkdir -p target/dependency \
    && cd target/dependency \
    && jar -xf ../*.jar

# Create optimized JRE using jlink
RUN jlink \
    --add-modules java.base,java.logging,java.sql,java.naming,java.desktop,java.management,java.security.jgss,java.instrument,jdk.unsupported \
    --strip-debug \
    --no-man-pages \
    --no-header-files \
    --compress=2 \
    --output /javaruntime

# Stage 2: Production stage
FROM eclipse-temurin:17-jre-alpine

# Set working directory
WORKDIR /app

# Create non-root user/group
RUN addgroup -S fpbe-group && adduser -S fpbe-user -G fpbe-group

# Copy optimized JRE and application from builder
COPY --from=builder /javaruntime /opt/java/openjdk
COPY --from=builder /build/target/*.jar app.jar

# Set strict permissions
RUN chown -R fpbe-user:fpbe-group /app \
    && chmod -R 500 /app \
    && chmod 400 app.jar

# Install security updates and basic tools
RUN apk update && apk upgrade \
    && apk add --no-cache tini tzdata curl \
    && rm -rf /var/cache/apk/*

# Configure JVM options for containers
ENV JAVA_HOME=/opt/java/openjdk
ENV PATH="${JAVA_HOME}/bin:${PATH}"
ENV JAVA_OPTS="-XX:+UseContainerSupport \
    -XX:MaxRAMPercentage=75.0 \
    -XX:+ExitOnOutOfMemoryError \
    -XX:+HeapDumpOnOutOfMemoryError \
    -XX:HeapDumpPath=/tmp \
    -Djava.security.egd=file:/dev/./urandom \
    -Dspring.profiles.active=production"

# Configure health check
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD curl -f http://localhost:8083/actuator/health || exit 1

# Set container metadata labels
LABEL org.opencontainers.image.title="FPBE Transaction Service" \
      org.opencontainers.image.description="Transaction processing microservice for FPBE banking platform" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.vendor="First PIMISR Bank Elmahrosa" \
      security.alpha.kubernetes.io/seccomp-profile="runtime/default"

# Configure security options
RUN mkdir -p /tmp/heap-dumps && chown fpbe-user:fpbe-group /tmp/heap-dumps
USER fpbe-user

# Expose service port
EXPOSE 8083

# Use tini as init process
ENTRYPOINT ["/sbin/tini", "--"]

# Define the application startup command
CMD ["java", ${JAVA_OPTS}, "-jar", "app.jar"]