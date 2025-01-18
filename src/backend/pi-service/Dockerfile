# Stage 1: Builder
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Create non-root user/group
RUN addgroup -g 1000 node && \
    adduser -u 1000 -G node -s /bin/sh -D node

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files with appropriate permissions
COPY --chown=node:node package*.json ./

# Install production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code and TypeScript configs
COPY --chown=node:node tsconfig*.json ./
COPY --chown=node:node src/ ./src/

# Build TypeScript code
RUN npm run build && \
    rm -rf src/ tsconfig*.json

# Stage 2: Production
FROM node:18-alpine

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Set working directory
WORKDIR /usr/src/app

# Create non-root user/group if not exists
RUN addgroup -g 1000 node || true && \
    adduser -u 1000 -G node -s /bin/sh -D node || true

# Install production dependencies
RUN apk add --no-cache tini

# Copy built artifacts and dependencies from builder
COPY --from=builder --chown=node:node /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=node:node /usr/src/app/dist ./dist
COPY --from=builder --chown=node:node /usr/src/app/package*.json ./

# Set secure file permissions
RUN chmod -R 644 dist/ && \
    chmod -R 644 package*.json && \
    chmod -R 755 node_modules/

# Configure health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

# Expose application port
EXPOSE ${PORT}

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Switch to non-root user
USER node

# Start application
CMD ["node", "dist/index.js"]