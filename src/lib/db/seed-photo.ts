import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  type ImageExt,
  saveProductPhoto,
  saveQrisPhoto,
} from "../upload/storage";

/**
 * Salin foto demo statis (`public/img/menu/<filename>`) ke storage upload
 * sungguhan (`saveProductPhoto`), supaya `photoUrl` hasil seed berbentuk
 * `/uploads/products/<uuid>.<ext>` — sama seperti upload asli, dan lolos
 * `PRODUCT_PHOTO_URL_PATTERN` saat Pedagang meng-Ubah Item hasil seed
 * (sebelumnya photoUrl seed langsung "/img/menu/....jpg" gagal validasi).
 */
export async function seedProductPhoto(filename: string): Promise<string> {
  const ext = path.extname(filename).slice(1) as ImageExt;
  const bytes = await readFile(
    path.join(process.cwd(), "public", "img", "menu", filename),
  );
  return saveProductPhoto(bytes, ext);
}

/** Sama seperti {@link seedProductPhoto}, tapi untuk foto QRIS pribadi Pedagang (`public/img/qris/<filename>`). */
export async function seedQrisPhoto(filename: string): Promise<string> {
  const ext = path.extname(filename).slice(1) as ImageExt;
  const bytes = await readFile(
    path.join(process.cwd(), "public", "img", "qris", filename),
  );
  return saveQrisPhoto(bytes, ext);
}
