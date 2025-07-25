# ------------------------
# Stage 1: Build Stage
# ------------------------
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Create non-root user
RUN addgroup -g 1000 node && \
    adduser -u 1000 -G node -s /bin/sh -D node

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files and install only production deps for build
COPY --chown=node:node package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy TypeScript source and configs
COPY --chown=node:node tsconfig*.json ./
COPY --chown=node:node src ./src

# Build the application
RUN npm run build

# ------------------------
# Stage 2: Production Stage
# ------------------------
FROM node:18-alpine

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /usr/src/app

# Create same non-root user
RUN addgroup -g 1000 node && \
    adduser -u 1000 -G node -s /bin/sh -D node

# Install tini (init system)
RUN apk add --no-cache tini wget

# Copy build artifacts and node_modules from builder
COPY --from=builder --chown=node:node /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=node:node /usr/src/app/dist ./dist
COPY --from=builder --chown=node:node /usr/src/app/package*.json ./

# Set proper permissions
RUN chmod -R 755 node_modules && \
    chmod -R 644 dist && \
    chmod 644 package*.json

# Healthcheck endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT}/health || exit 1

# Expose port
EXPOSE ${PORT}

# Use tini as init
ENTRYPOINT ["/sbin/tini", "--"]

# Switch to non-root user
USER node

# Run the app
CMD ["node", "dist/index.js"]
