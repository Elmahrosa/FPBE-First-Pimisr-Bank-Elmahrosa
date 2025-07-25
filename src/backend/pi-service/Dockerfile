# Stage 1: Builder
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Create non-root user
RUN addgroup -g 1000 node && \
    adduser -u 1000 -G node -s /bin/sh -D node

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY --chown=node:node package*.json ./

# Install production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy TypeScript source and configs
COPY --chown=node:node tsconfig*.json ./
COPY --chown=node:node src/ ./src/

# Build the TypeScript app
RUN npm run build

# Stage 2: Runtime
FROM node:18-alpine

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /usr/src/app

# Create non-root user
RUN addgroup -g 1000 node && \
    adduser -u 1000 -G node -s /bin/sh -D node

# Install tini for PID 1 handling and wget for healthcheck
RUN apk add --no-cache tini wget

# Copy built files and dependencies
COPY --from=builder --chown=node:node /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=node:node /usr/src/app/dist ./dist
COPY --from=builder --chown=node:node /usr/src/app/package*.json ./

# Healthcheck endpoint (adjust if different)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT}/health || exit 1

# Expose the port your app runs on
EXPOSE ${PORT}

# Use tini as the init system
ENTRYPOINT ["/sbin/tini", "--"]

# Run as non-root user
USER node

# Start the app
CMD ["node", "dist/index.js"]
