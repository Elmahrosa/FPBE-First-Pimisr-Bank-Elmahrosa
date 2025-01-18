# Stage 1: Builder
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install build dependencies with security configurations
RUN npm config set audit=true \
    && npm config set strict-ssl=true \
    && npm ci --only=production \
    && npm cache clean --force

# Copy source code and TypeScript config
COPY tsconfig*.json ./
COPY src ./src

# Build TypeScript application
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Stage 2: Production
FROM node:18-alpine

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV NODE_OPTIONS="--max-old-space-size=2048"
ENV NPM_CONFIG_LOGLEVEL=warn
ENV NPM_CONFIG_PRODUCTION=true

# Set working directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001 -G nodejs

# Copy built artifacts from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Configure security settings
RUN apk add --no-cache wget \
    && mkdir -p /app/tmp \
    && chown -R nodejs:nodejs /app \
    && chmod -R 555 /app \
    && chmod -R 555 /app/dist \
    && chmod -R 555 /app/node_modules \
    && chmod 777 /app/tmp

# Set up read-only filesystem
VOLUME ["/app/node_modules", "/tmp"]

# Labels for container metadata
LABEL maintainer="FPBE DevOps Team" \
      description="API Gateway service for FPBE mobile banking platform" \
      version="1.0.0" \
      security.protocol="strict" \
      monitoring.enabled="true"

# Health check configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Expose API gateway port
EXPOSE 3000

# Switch to non-root user
USER nodejs

# Set resource limits
WORKDIR /app
CMD ["node", "--max-old-space-size=2048", "dist/index.js"]

# Security options
SECURITY_OPT ["no-new-privileges:true"]

# Resource limits
LIMIT_AS=2147483648
LIMIT_NOFILE=1000
LIMIT_NPROC=50