# Dockerfile pentru NestJS Backend API - OPTIMIZED
# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app

# ============================================
# Stage 1: Install dependencies with cache
# ============================================
FROM base AS deps
RUN apk add --no-cache libc6-compat

# Copy only package files first (better cache)
COPY package.json pnpm-lock.yaml ./

# Install pnpm and dependencies in one layer with cache mount
RUN corepack enable pnpm && corepack prepare pnpm@latest --activate
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prefer-offline

# ============================================
# Stage 2: Build the application
# ============================================
FROM base AS builder

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY package.json pnpm-lock.yaml ./
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY src ./src

# Build
RUN corepack enable pnpm && pnpm run build

# ============================================
# Stage 3: Production runner (minimal)
# ============================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy only what's needed for production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./

# Install only production dependencies (smaller image)
RUN corepack enable pnpm && corepack prepare pnpm@latest --activate
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod --prefer-offline

USER nestjs

EXPOSE 3000
ENV PORT=3000

CMD ["node", "dist/main.js"]
