#!/bin/sh
# Entrypoint image produksi (dipakai Dokploy). Urutan setiap container start:
#   1. Terapkan migrasi database (selalu, idempoten).
#   2. Kalau SEED_DEMO=true: isi data demo (idempoten, tanpa TRUNCATE), lalu
#      isi/segarkan riwayat Pesanan demo (30 hari terakhir, idempoten lewat
#      marker) supaya asisten rekomendasi punya data untuk ditampilkan.
#   3. Jalankan server Next.js (perintah dari CMD Dockerfile).
# Lihat docs/ARSITEKTUR-SISTEM.md ADR 2026-09-07 & 2026-09-15.
set -e

# Direktori upload (volume Docker di produksi) — pastikan ada & bisa ditulis
# walau volume dimount kosong. Lihat docs/ARSITEKTUR-SISTEM.md ADR 2026-09-08.
mkdir -p "${UPLOADS_DIR:-/app/uploads}/products"

echo "[entrypoint] Menerapkan migrasi database..."
node /app/scripts/migrate.mjs

if [ "$SEED_DEMO" = "true" ]; then
  echo "[entrypoint] SEED_DEMO=true — mengisi data demo..."
  node /app/scripts/seed-demo.mjs
  echo "[entrypoint] Mengisi riwayat Pesanan demo (untuk asisten rekomendasi)..."
  node /app/scripts/seed-demo-orders.mjs
fi

echo "[entrypoint] Memulai server..."
exec "$@"
