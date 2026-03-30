# ============================================================
# Frontend Dockerfile — Multi-stage build
# Stage 1: Build Vite React app
# Stage 2: Serve with Nginx (production)
# ============================================================

# Stage 1 — Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and build
COPY . .
# Build args let CI/CD inject the API URL at build time
ARG VITE_API_URL=http://localhost:3000
ARG VITE_STRIPE_PUBLISHABLE_KEY=""
ARG VITE_AGORA_APP_ID=""
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY
ENV VITE_AGORA_APP_ID=$VITE_AGORA_APP_ID
RUN npm run build

# Stage 2 — Serve with Nginx
FROM nginx:1.25-alpine
WORKDIR /usr/share/nginx/html

# Remove default Nginx static content
RUN rm -rf ./*

# Copy built Vite output
COPY --from=builder /app/dist .

# Nginx config for SPA routing (React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
