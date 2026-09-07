import { hashPassword } from "../auth/password";
import { client, db } from "./client";
import { admins } from "./schema";

/**
 * Membuat satu akun Admin. Dijalankan MANUAL (bukan otomatis saat boot) —
 * lihat docs/TEKNOLOGI.md §Autentikasi: akun Admin sengaja tidak punya UI
 * self-service.
 *
 * Di server: buka Terminal container aplikasi di Dokploy, lalu:
 *   node scripts/create-admin.mjs "Nama Admin" "081234567890" "PasswordKuat"
 *
 * Di lokal: `pnpm admin:create -- "Nama Admin" "0812..." "PasswordKuat"`
 *
 * Idempoten pada nomor HP: kalau nomor sudah terdaftar, tidak ada perubahan.
 * Di-bundle jadi `scripts/create-admin.mjs` (mandiri) oleh esbuild.
 */
const [name, phone, password] = process.argv.slice(2);

if (!name || !phone || !password) {
  console.error(
    'Pemakaian: node scripts/create-admin.mjs "<nama>" "<nomor HP>" "<password>"',
  );
  process.exit(1);
}

async function main(): Promise<void> {
  const existing = await db.query.admins.findFirst({
    columns: { id: true },
    where: (a, { eq }) => eq(a.phone, phone),
  });
  if (existing) {
    console.log(`Admin dengan nomor ${phone} sudah ada — tidak ada perubahan.`);
    return;
  }

  await db
    .insert(admins)
    .values({ name, phone, passwordHash: await hashPassword(password) });
  console.log(`Admin dibuat: ${name} (${phone})`);
}

main()
  .catch((error) => {
    console.error("Pembuatan Admin GAGAL:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
