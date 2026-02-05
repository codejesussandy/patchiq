# Base stage
FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
# Note: pnpm-lock.yaml lives at workspace root, not in backend/.
# Docker build context is ./backend so we can't copy the lockfile.
# The workspace:* dependency on @patchiq/shared-types must be stripped
# since pnpm can't resolve workspace references outside a workspace.
COPY package.json ./
RUN node -e "const p=require('./package.json'); delete p.dependencies['@patchiq/shared-types']; require('fs').writeFileSync('package.json', JSON.stringify(p, null, 2)+'\n')"

# Development stage
FROM base AS development
RUN apk add --no-cache --repository=https://dl-cdn.alpinelinux.org/alpine/v3.18/community openssl1.1-compat
RUN pnpm install
COPY . .
RUN npx prisma generate --schema src/db/prisma/schema.prisma
EXPOSE 5002
CMD ["pnpm", "run", "dev"]

# Build stage
FROM base AS builder
RUN pnpm install
COPY . .
RUN pnpm run build
RUN pnpm prune --prod

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./
COPY --from=builder --chown=nodejs:nodejs /app/src/db/prisma ./prisma

# Switch to non-root user
USER nodejs

EXPOSE 5002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5002/health || exit 1

CMD ["node", "dist/server.js"]
