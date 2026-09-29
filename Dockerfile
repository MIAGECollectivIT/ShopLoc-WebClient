# Stage 1 : Build de l'application Astro
FROM node:22-alpine AS builder
WORKDIR /app

# Dépendances avec cache Docker
COPY shoploc/package*.json ./
RUN npm ci

# Copie du code source et compilation Astro SSR
COPY shoploc/ ./
RUN npm run build

# Stage 2 : Image d'exécution légère Node.js
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
