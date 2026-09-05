import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db/client";
import { adminSessions, admins } from "@/lib/db/schema";

export const ADMIN_SESSION_COOKIE_NAME = "mygerai_admin_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 hari

export type AdminSession = {
  adminId: string;
  name: string;
  phone: string;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Buat sesi baru + set cookie. Hanya dipanggil dari Server Action (`src/server/admins.ts`). */
export async function createAdminSession(adminId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db
    .insert(adminSessions)
    .values({ adminId, tokenHash: hashToken(token), expiresAt });

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });
}

/** Baca & validasi sesi Admin dari cookie. Aman dipanggil dari Server Component maupun Server Action. */
export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await db.query.adminSessions.findFirst({
    where: and(
      eq(adminSessions.tokenHash, hashToken(token)),
      gt(adminSessions.expiresAt, new Date()),
    ),
  });
  if (!session) return null;

  const admin = await db.query.admins.findFirst({
    where: eq(admins.id, session.adminId),
  });
  if (!admin) return null;

  return { adminId: admin.id, name: admin.name, phone: admin.phone };
}

/** Hapus sesi (logout). Hanya dipanggil dari Server Action. */
export async function destroyAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  if (token) {
    await db
      .delete(adminSessions)
      .where(eq(adminSessions.tokenHash, hashToken(token)));
  }
  cookieStore.delete(ADMIN_SESSION_COOKIE_NAME);
}
