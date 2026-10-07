import type { z } from "zod";
import { parseBearerToken } from "@/lib/auth/bearer";
import { getMerchantSession, type MerchantSession } from "@/lib/auth/session";
import { apiError, UNAUTHORIZED_MESSAGE } from "@/lib/mobile-api/respond";

type MerchantContext = {
  request: Request;
  session: MerchantSession;
  token: string;
};

/**
 * Bungkus Route Handler API mobile yang butuh login Pedagang. Wajib header
 * `Authorization: Bearer` — cookie web saja ditolak, supaya API ini tidak bisa
 * dipicu lintas situs memakai cookie browser (CSRF).
 */
export async function withMerchant(
  request: Request,
  handler: (ctx: MerchantContext) => Promise<Response>,
): Promise<Response> {
  const token = parseBearerToken(request.headers.get("authorization"));
  if (!token) return apiError("unauthorized", UNAUTHORIZED_MESSAGE);

  return runSafely(async () => {
    const session = await getMerchantSession();
    if (!session) return apiError("unauthorized", UNAUTHORIZED_MESSAGE);
    return handler({ request, session, token });
  });
}

/** Tangkap error tak terduga jadi 500 berformat API (bug tetap tercatat di log). */
export async function runSafely(
  fn: () => Promise<Response>,
): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    console.error("[mobile-api]", error);
    return apiError("server_error", "Terjadi kesalahan di server. Coba lagi.");
  }
}

/**
 * Baca body JSON tanpa validasi, untuk diteruskan ke Server Action yang
 * memvalidasi input-nya sendiri dengan Zod (menghindari validasi ganda pada
 * skema yang punya transform). Hanya objek yang diterima.
 */
export async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown> | Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("bad_request", "Format data tidak valid.");
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return apiError("bad_request", "Format data tidak valid.");
  }
  return body as Record<string, unknown>;
}

/** Baca `FormData` (upload foto). Gagal parse → `Response` error siap dikembalikan. */
export async function readFormData(
  request: Request,
): Promise<FormData | Response> {
  try {
    return await request.formData();
  } catch {
    return apiError("bad_request", "Unggahan tidak valid.");
  }
}

/** Baca body JSON dan validasi dengan Zod. Gagal → `Response` error siap dikembalikan. */
export async function parseJson<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<z.infer<S> | Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("bad_request", "Format data tidak valid.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "validation",
      parsed.error.issues[0]?.message ?? "Data tidak valid.",
    );
  }
  return parsed.data;
}
