# syntax=docker/dockerfile:1
# Dipakai Dokploy untuk build & deploy image produksi di server Garuda.
# Untuk development lokal, pakai `pnpm dev` + docker-compose.dev.yml (Postgres saja).

FROM node:24-alpine AS base
RUN corepack enable

# ---- Install dependency (cache terpisah supaya build ulang lebih cepat) ----
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---- Build aplikasi ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# DATABASE_URL cuma perlu placeholder valid saat build — Next.js meng-import
# src/lib/db/client.ts saat "collecting page data", tapi tidak benar-benar
# connect ke DB. DATABASE_URL asli di-set di runtime lewat env var Dokploy.
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/placeholder"
RUN pnpm build

# ---- Runtime (image akhir, minimal) ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
