import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import {
  MOBILE_SESSION_DURATION_MS,
  parseBearerToken,
  renewedMobileExpiry,
} from "@/lib/auth/bearer";
import { db } from "@/lib/db/client";
import { merchants, sessions } from "@/lib/db/schema";

export const SESSION_COOKIE_NAME = "mygerai_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 hari

export type MerchantSession = {
  merchantId: string;
  slug: string;
  stallName: string;
  sessionId: string;
  client: "web" | "mobile";
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Simpan sesi baru di DB dan kembalikan token mentah (hanya hash-nya yang disimpan). */
export async function createMerchantToken(
  merchantId: string,
  client: "web" | "mobile",
): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const duration =
    client === "mobile" ? MOBILE_SESSION_DURATION_MS : SESSION_DURATION_MS;

  await db.insert(sessions).values({
    merchantId,
    tokenHash: hashToken(token),
    client,
    expiresAt: new Date(Date.now() + duration),
  });
  return token;
}

/** Buat sesi web baru + set cookie. Hanya dipanggil dari Server Action (`src/server/merchants.ts`). */
export async function createMerchantSession(merchantId: string): Promise<void> {
  const token = await createMerchantToken(merchantId, "web");

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });
}

/** Validasi token sesi (dari cookie atau Bearer). Sesi mobile yang masih dipakai diperpanjang otomatis. */
export async function resolveMerchantSessionByToken(
  token: string,
): Promise<MerchantSession | null> {
  const now = new Date();
  const session = await db.query.sessions.findFirst({
    where: and(
      eq(sessions.tokenHash, hashToken(token)),
      gt(sessions.expiresAt, now),
    ),
  });
  if (!session) return null;

  const merchant = await db.query.merchants.findFirst({
    where: eq(merchants.id, session.merchantId),
  });
  // Re-cek status approved tiap request — begitu Admin (Fase 4) suspend Pedagang,
  // sesi lama otomatis invalid tanpa perlu proses cabut-sesi eksplisit.
  if (!merchant || merchant.status !== "approved") return null;

  if (session.client === "mobile") {
    const renewed = renewedMobileExpiry(session.expiresAt, now);
    if (renewed) {
      await db
        .update(sessions)
        .set({ expiresAt: renewed })
        .where(eq(sessions.id, session.id));
    }
  }

  return {
    merchantId: merchant.id,
    slug: merchant.slug,
    stallName: merchant.stallName,
    sessionId: session.id,
    client: session.client,
  };
}

/**
 * Sesi Pedagang dari header `Authorization: Bearer` (aplikasi Android), atau
 * dari cookie (web). Aman dipanggil dari Server Component, Server Action,
 * maupun Route Handler `/api/mobile/v1/*`.
 */
export async function getMerchantSession(): Promise<MerchantSession | null> {
  const bearer = parseBearerToken((await headers()).get("authorization"));
  if (bearer) return resolveMerchantSessionByToken(bearer);

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return resolveMerchantSessionByToken(token);
}

/** Hapus satu sesi berdasarkan token mentah (logout aplikasi). Token push perangkat ikut terhapus (cascade). */
export async function revokeMerchantSessionByToken(
  token: string,
): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

/** Hapus sesi web (logout). Hanya dipanggil dari Server Action. */
export async function destroyMerchantSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) await revokeMerchantSessionByToken(token);
  cookieStore.delete(SESSION_COOKIE_NAME);
}
