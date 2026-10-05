import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL belum di-set di environment variable (lihat .env.example).",
  );
}

/**
 * Ukuran pool & batas waktu query bisa diatur lewat env (lihat .env.example).
 * Bawaan postgres.js cuma 10 koneksi — stress test membuktikan semua request
 * mengantre di situ (docs/STRESS-TEST.md P1-3). `statement_timeout` mencegah
 * satu query macet menahan koneksi pool tanpa batas.
 */
function positiveIntEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export const client = postgres(connectionString, {
  max: positiveIntEnv("DATABASE_POOL_MAX", 20),
  connection: {
    statement_timeout: positiveIntEnv("DATABASE_STATEMENT_TIMEOUT_MS", 15_000),
  },
});

export const db = drizzle(client, { schema, casing: "snake_case" });
