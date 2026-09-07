import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/**
 * Menerapkan semua migrasi di folder `drizzle/` ke database yang ditunjuk
 * `DATABASE_URL`. Dijalankan otomatis oleh `docker-entrypoint.sh` setiap
 * container start (lihat Dockerfile & docs/ARSITEKTUR-SISTEM.md ADR
 * 2026-09-07). Idempoten: migrasi yang sudah pernah diterapkan dilewati
 * (Drizzle mencatatnya di tabel `drizzle.__drizzle_migrations`).
 *
 * Untuk dev lokal pakai `pnpm db:migrate` (drizzle-kit) seperti biasa —
 * file ini khusus dipakai di image produksi, di-bundle jadi
 * `scripts/migrate.mjs` (mandiri, tanpa node_modules) oleh esbuild.
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL belum di-set di environment variable (lihat .env.example).",
  );
}

// Folder migrasi disalin ke image di `/app/drizzle`; file ini ada di
// `/app/scripts/migrate.mjs`, jadi relatif "../drizzle" — tidak bergantung
// pada working directory saat skrip dipanggil.
const migrationsFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "drizzle",
);

async function main(url: string): Promise<void> {
  // `onnotice` di-nolkan supaya log deploy tidak penuh NOTICE bawaan Postgres
  // (mis. "schema drizzle already exists, skipping") yang bukan error.
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(sql), { migrationsFolder });
    console.log("Migrasi database selesai.");
  } finally {
    await sql.end();
  }
}

main(connectionString).catch((error) => {
  console.error("Migrasi database GAGAL:", error);
  process.exit(1);
});
