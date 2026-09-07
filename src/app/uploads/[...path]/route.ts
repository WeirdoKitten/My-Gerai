import { readFile } from "node:fs/promises";
import path from "node:path";
import { UPLOADS_DIR } from "@/lib/upload/storage";

const CONTENT_TYPE: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/**
 * Menyajikan file yang diunggah Pedagang dari `UPLOADS_DIR` (volume Docker di
 * produksi — di luar `public/` yang dibaked saat build). Publik: foto Item
 * tampil di menu Pembeli. Nama file acak (UUID) → tidak bisa dienumerasi.
 */
export async function GET(
  _request: Request,
  context: RouteContext<"/uploads/[...path]">,
) {
  const { path: segments } = await context.params;

  const ext = path.extname(segments.at(-1) ?? "").toLowerCase();
  const contentType = CONTENT_TYPE[ext];
  if (!contentType) return new Response("Not found", { status: 404 });

  // Anti path-traversal: resolve lalu pastikan hasil masih di dalam UPLOADS_DIR.
  const target = path.resolve(UPLOADS_DIR, ...segments);
  if (target !== UPLOADS_DIR && !target.startsWith(UPLOADS_DIR + path.sep)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const file = await readFile(target);
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        // File dari pengguna disajikan di origin aplikasi — cegah MIME-sniffing
        // jadi selain gambar.
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
