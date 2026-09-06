import { execSync } from "node:child_process";
import path from "node:path";
import dotenv from "dotenv";

/**
 * Jalankan migrasi + seed sekali terhadap `mygerai_test` sebelum suite E2E
 * mulai — database terpisah dari DB dev (lihat .env.test) supaya `pnpm
 * test:e2e` tidak men-TRUNCATE data yang sedang dipakai untuk uji manual.
 */
export default function globalSetup(): void {
  const { parsed } = dotenv.config({
    path: path.resolve(__dirname, "../../.env.test"),
  });
  const databaseUrl = parsed?.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      ".env.test tidak ditemukan atau DATABASE_URL kosong — lihat docs/TEKNOLOGI.md untuk cara setup DB test.",
    );
  }
  if (
    !databaseUrl.includes("localhost") &&
    !databaseUrl.includes("127.0.0.1")
  ) {
    throw new Error(
      "DATABASE_URL di .env.test harus mengarah ke localhost (guard yang sama dengan seed.ts).",
    );
  }

  const env = { ...process.env, DATABASE_URL: databaseUrl };
  execSync("pnpm run db:migrate", { stdio: "inherit", env });
  execSync("pnpm run db:seed", { stdio: "inherit", env });
}
