import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db/client";
import { merchants, sessions } from "@/lib/db/schema";

export const SESSION_COOKIE_NAME = "mygerai_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 hari

export type MerchantSession = {
  merchantId: string;
  slug: string;
  stallName: string;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Buat sesi baru + set cookie. Hanya dipanggil dari Server Action (`src/server/merchants.ts`). */
export async function createMerchantSession(merchantId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db
    .insert(sessions)
    .values({ merchantId, tokenHash: hashToken(token), expiresAt });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });
}

/** Baca & validasi sesi dari cookie. Aman dipanggil dari Server Component maupun Server Action. */
export async function getMerchantSession(): Promise<MerchantSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await db.query.sessions.findFirst({
    where: and(
      eq(sessions.tokenHash, hashToken(token)),
      gt(sessions.expiresAt, new Date()),
    ),
  });
  if (!session) return null;

  const merchant = await db.query.merchants.findFirst({
    where: eq(merchants.id, session.merchantId),
  });
  // Re-cek status approved tiap request — begitu Admin (Fase 4) suspend Pedagang,
  // sesi lama otomatis invalid tanpa perlu proses cabut-sesi eksplisit.
  if (!merchant || merchant.status !== "approved") return null;

  return {
    merchantId: merchant.id,
    slug: merchant.slug,
    stallName: merchant.stallName,
  };
}

/** Hapus sesi (logout). Hanya dipanggil dari Server Action. */
export async function destroyMerchantSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}
