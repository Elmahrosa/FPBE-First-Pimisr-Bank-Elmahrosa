# -----------------------------
# Node.js Build Stage
# -----------------------------
FROM node:18-alpine AS node-builder
# node:18-alpine version: 18.17.1

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files for workspace
COPY package*.json ./
COPY */package*.json ./*/
COPY yarn.lock ./

# Install dependencies using workspace
RUN yarn install --frozen-lockfile --production=false

# Copy source code
COPY . .

# Build TypeScript code
RUN yarn workspaces run build

# -----------------------------
# Java Build Stage
# -----------------------------
FROM maven:3.8-eclipse-temurin-17 AS java-builder
# maven:3.8-eclipse-temurin-17 version: 3.8.8

WORKDIR /app

# Copy Maven files
COPY pom.xml ./
COPY */pom.xml ./*/

# Download dependencies in separate layer
RUN mvn dependency:go-offline -B

# Copy source code and build
COPY . .
RUN mvn package -DskipTests

# -----------------------------
# Node.js Production Stage
# -----------------------------
FROM node:18-alpine AS node-production
# node:18-alpine version: 18.17.1

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 nonroot && \
    adduser -u 1001 -G nonroot -s /bin/false -D nonroot

# Install production dependencies
COPY --from=node-builder /app/package*.json ./
COPY --from=node-builder /app/yarn.lock ./
RUN yarn install --frozen-lockfile --production=true

# Copy built artifacts for each Node.js service
COPY --from=node-builder /app/api-gateway/dist ./api-gateway/dist
COPY --from=node-builder /app/auth-service/dist ./auth-service/dist
COPY --from=node-builder /app/pi-service/dist ./pi-service/dist

# Set permissions
RUN chown -R nonroot:nonroot /app && \
    chmod -R 440 /app

# Configure container
USER nonroot
ENV NODE_ENV=production
ENV TZ=UTC

# Security configurations
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

# Drop all capabilities and set security options
SECURITY_OPTS="no-new-privileges:true"
CAPABILITIES="ALL"

# Resource limits
ENV NODE_OPTIONS="--max-old-space-size=1024"

EXPOSE 3000
CMD ["node", "--enable-source-maps", "dist/main.js"]

# -----------------------------
# Java Production Stage
# -----------------------------
FROM eclipse-temurin:17-jre-alpine AS java-production
# eclipse-temurin:17-jre-alpine version: 17.0.8

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 nonroot && \
    adduser -u 1001 -G nonroot -s /bin/false -D nonroot

# Copy built JARs for each Java service
COPY --from=java-builder /app/account-service/target/*.jar ./account-service/app.jar
COPY --from=java-builder /app/transaction-service/target/*.jar ./transaction-service/app.jar

# Set permissions
RUN chown -R nonroot:nonroot /app && \
    chmod -R 440 /app

# Configure container
USER nonroot
ENV TZ=UTC
ENV LANG=en_US.UTF-8
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75 -XX:InitialRAMPercentage=50"

# Security configurations
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/actuator/health || exit 1

# Drop all capabilities and set security options
SECURITY_OPTS="no-new-privileges:true"
CAPABILITIES="ALL"

# Resource limits
ENV JAVA_XMS="256m"
ENV JAVA_XMX="1g"

EXPOSE 8080
CMD ["java", "-jar", "app.jar"]

# Build arguments for service selection
ARG SERVICE_TYPE
ARG SERVICE_NAME

# Final stage selection based on service type
FROM ${SERVICE_TYPE}-production AS final