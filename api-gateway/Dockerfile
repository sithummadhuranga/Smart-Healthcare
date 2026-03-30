# =============================================================
# API Gateway — Multi-stage Docker build
# Stage 1: compile TypeScript → Stage 2: lean production image
# =============================================================

# ── Stage 1: Builder ──────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy manifest + lock file first for optimal layer caching.
# Layer is only invalidated when dependencies actually change.
COPY package*.json tsconfig.json ./
RUN npm ci

COPY src/ ./src/
RUN npm run build

# ── Stage 2: Production runner ────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER appuser

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1
CMD ["node", "dist/index.js"]
