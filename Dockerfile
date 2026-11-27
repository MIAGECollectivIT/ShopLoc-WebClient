# syntax=docker/dockerfile:1.7
# Stage 1: Build the Astro application on the build host platform (avoids QEMU emulation overhead/SIGILL)
FROM --platform=$BUILDPLATFORM node:22-alpine AS builder
WORKDIR /app

# Install dependencies with BuildKit npm cache
COPY shoploc/package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# Copy source code, build Astro SSR bundle, and prune devDependencies
COPY shoploc/ ./
RUN npm run build && npm prune --omit=dev

# Stage 2: Lightweight non-root runtime image for the target platform
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=builder --chown=node:node /app/package*.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "./dist/server/entry.mjs"]
