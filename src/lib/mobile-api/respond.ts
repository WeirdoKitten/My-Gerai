import { RATE_LIMIT_MESSAGE } from "@/lib/rate-limit/limiter";

/*
 * Format respons tunggal API mobile (`/api/mobile/v1/*`), lihat docs/API-MOBILE.md.
 * Modul murni (tanpa DB/Next) supaya bisa di-unit-test.
 */

export type ApiErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation"
  | "rate_limited"
  | "server_error";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  validation: 422,
  rate_limited: 429,
  server_error: 500,
};

export function apiOk<T>(data: T, status = 200): Response {
  return Response.json({ ok: true, data }, { status });
}

export function apiError(code: ApiErrorCode, message: string): Response {
  return Response.json(
    { ok: false, error: { code, message } },
    { status: STATUS_BY_CODE[code] },
  );
}

export const UNAUTHORIZED_MESSAGE = "Sesi berakhir, silakan login kembali.";

/**
 * Ubah hasil Server Action (`{ ok: true, ... }` / `{ ok: false, message }`)
 * jadi respons API. Pesan gagal dari action sudah Bahasa Indonesia yang ramah
 * pengguna, jadi diteruskan apa adanya.
 */
export function fromActionResult<T extends { ok: boolean }>(
  result: T,
): Response {
  if (result.ok) {
    const { ok: _ok, ...data } = result;
    return apiOk(data);
  }
  const message =
    "message" in result && typeof result.message === "string"
      ? result.message
      : "Permintaan tidak dapat diproses.";
  if (message === RATE_LIMIT_MESSAGE) return apiError("rate_limited", message);
  if (message === UNAUTHORIZED_MESSAGE)
    return apiError("unauthorized", message);
  if (/tidak ditemukan/i.test(message)) return apiError("not_found", message);
  return apiError("bad_request", message);
}
