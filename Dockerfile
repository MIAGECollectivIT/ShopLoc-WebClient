# Stage 1: Build the Astro application
FROM node:22-alpine AS builder
WORKDIR /app
ENV ASTRO_TELEMETRY_DISABLED=1

# Install dependencies with Docker layer cache
COPY shoploc/package*.json ./
RUN npm ci

# Copy source code and build Astro SSR bundle
COPY shoploc/ ./
RUN npm run build

# Stage 2: Lightweight runtime image
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "./dist/server/entry.mjs"]
