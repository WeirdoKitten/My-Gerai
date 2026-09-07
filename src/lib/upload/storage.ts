import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Direktori penyimpanan file yang diunggah Pedagang. Di produksi = volume
 * Docker persisten (`ENV UPLOADS_DIR=/app/uploads` di Dockerfile, dimount
 * lewat Dokploy). Di dev = `.uploads/` di root repo (di-gitignore).
 * Lihat docs/ARSITEKTUR-SISTEM.md ADR 2026-09-08 (upload foto).
 */
export const UPLOADS_DIR =
  process.env.UPLOADS_DIR ?? path.join(process.cwd(), ".uploads");

const PRODUCT_PHOTO_DIR = path.join(UPLOADS_DIR, "products");

export type ImageExt = "jpg" | "png" | "webp";

const MAGIC: Array<{ ext: ImageExt; test: (b: Buffer) => boolean }> = [
  { ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    ext: "png",
    test: (b) =>
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a,
  },
  {
    ext: "webp",
    test: (b) =>
      b.toString("ascii", 0, 4) === "RIFF" &&
      b.toString("ascii", 8, 12) === "WEBP",
  },
];

/** Tipe gambar dari isi file (magic bytes) — bukan dari nama/mime klien. `null` = bukan gambar yang didukung. */
export function detectImage(bytes: Buffer): ImageExt | null {
  return MAGIC.find((m) => m.test(bytes))?.ext ?? null;
}

/** Tulis foto Item ke storage, kembalikan `photo_url` relatif. */
export async function saveProductPhoto(
  bytes: Buffer,
  ext: ImageExt,
): Promise<string> {
  const name = `${randomUUID()}.${ext}`;
  await mkdir(PRODUCT_PHOTO_DIR, { recursive: true });
  await writeFile(path.join(PRODUCT_PHOTO_DIR, name), bytes);
  return `/uploads/products/${name}`;
}
