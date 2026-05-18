# ── Pitbay customer-app — production Docker image for Fly.io ──
# Multi-stage build: a "deps" stage installs node modules with build tools
# (needed for better-sqlite3 native compile), then a slim "runner" stage
# copies just what's needed for runtime — keeps the image small.

# ───────── deps stage ─────────
FROM node:20-alpine AS deps
WORKDIR /app

# Build dependencies for better-sqlite3 (needs python/make/gcc to compile
# the native sqlite bindings during `npm ci`).
RUN apk add --no-cache python3 make g++

# Copy package manifests only first so this layer caches when source
# changes but deps don't.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ───────── runner stage ─────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Copy node_modules from deps stage (already compiled, no build tools needed)
COPY --from=deps /app/node_modules ./node_modules

# Copy the application source. .dockerignore excludes node_modules, www/,
# android/, ios/, etc. so we don't double-ship anything.
COPY . .

EXPOSE 3000

# Fly.io's healthcheck hits /health (configured in fly.toml).
CMD ["node", "server.js"]
