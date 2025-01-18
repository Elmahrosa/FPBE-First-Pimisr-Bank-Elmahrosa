# ---- Build Stage ----
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies including dev dependencies for build
RUN npm ci && \
    # Verify packages have no known vulnerabilities
    npm audit

# Copy TypeScript configuration
COPY tsconfig.json ./

# Copy source code
COPY src/ ./src/

# Build TypeScript code
RUN npm run build && \
    # Remove dev dependencies
    npm prune --production && \
    # Clean npm cache
    npm cache clean --force

# ---- Production Stage ----
FROM node:18-alpine

# Add labels for container metadata
LABEL maintainer="FPBE Development Team" \
      service="auth-service" \
      version="1.0.0" \
      security.scan-required="true"

# Set working directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Install security-related packages
RUN apk add --no-cache \
    curl \
    tzdata \
    # Clean up cache
    && rm -rf /var/cache/apk/*

# Copy built artifacts and production dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Set security configurations
RUN chown -R nodejs:nodejs /app && \
    chmod -R 755 /app

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    TZ=UTC

# Switch to non-root user
USER nodejs

# Health check configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Security hardening
RUN npm config set ignore-scripts true && \
    npm config set unsafe-perm false

# Expose application port
EXPOSE 3000

# Set security options
ENV NODE_OPTIONS="--max-old-space-size=512 --max-http-header-size=8192"

# Define entry point
CMD ["node", "dist/index.js"]