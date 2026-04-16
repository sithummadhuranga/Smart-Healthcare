# =============================================================
# API Gateway — Multi-stage Docker build
# Stage 1: compile TypeScript → Stage 2: lean production image
# =============================================================

# ── Stage 1: Builder ──────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
ENV NPM_CONFIG_FETCH_RETRIES=5 \
  NPM_CONFIG_FETCH_RETRY_FACTOR=2 \
  NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
  NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
  NPM_CONFIG_AUDIT=false \
  NPM_CONFIG_FUND=false

# Copy manifest + lock file first for optimal layer caching.
# Layer is only invalidated when dependencies actually change.
COPY package*.json tsconfig.json ./
RUN npm ci

COPY src/ ./src/
RUN npm run build && npm prune --omit=dev && npm cache clean --force

# ── Stage 2: Production runner ────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package*.json ./
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist

USER appuser

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1
CMD ["node", "dist/index.js"]
