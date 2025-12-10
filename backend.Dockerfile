# Dockerfile pentru NestJS Backend API
FROM node:20-alpine AS base

# Pin pnpm and set a stable store dir so installs are cached between builds
ENV PNPM_VERSION=10.25.0 \
    PNPM_HOME=/root/.local/share/pnpm \
    PATH="${PNPM_HOME}:${PATH}"

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./
# Prepares pinned pnpm once, then install dependencies using stable store dir
RUN corepack enable pnpm \
 && corepack prepare pnpm@${PNPM_VERSION} --activate \
 && pnpm install --frozen-lockfile --store-dir ${PNPM_HOME}/store

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN corepack enable pnpm \
 && corepack prepare pnpm@${PNPM_VERSION} --activate \
 && pnpm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Copy .env file if it exists (for ConfigModule to read)
# Docker Compose will also set these as environment variables via env_file
COPY .env* ./

USER nestjs

EXPOSE 3000

ENV PORT=3000

CMD ["node", "dist/main.js"]

