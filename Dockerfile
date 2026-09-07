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

# Bundle skrip DB jadi file .mjs mandiri (tanpa node_modules) — dijalankan
# oleh docker-entrypoint.sh saat container start. drizzle-orm + postgres
# di-inline oleh esbuild, jadi image runner tidak perlu devDependencies.
RUN pnpm exec esbuild \
      src/lib/db/migrate.ts \
      src/lib/db/seed-demo.ts \
      src/lib/db/create-admin.ts \
    --bundle --platform=node --target=node24 --format=esm \
    --outdir=scripts --out-extension:.js=.mjs

# ---- Runtime (image akhir, minimal) ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Direktori upload foto Item. Dimount sebagai named volume di Dokploy — volume
# kosong mewarisi ownership `nextjs:nodejs` dari sini saat pertama kali dipakai.
ENV UPLOADS_DIR=/app/uploads
RUN mkdir -p /app/uploads/products && chown -R nextjs:nodejs /app/uploads

# Migrasi + skrip DB + entrypoint (lihat docker-entrypoint.sh).
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Entrypoint menjalankan migrasi (dan seed demo kalau SEED_DEMO=true) lalu
# meneruskan ke CMD di bawah.
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
