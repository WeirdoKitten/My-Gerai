import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db/client";
import { eoSessions, eventOrganizers } from "@/lib/db/schema";

export const EO_SESSION_COOKIE_NAME = "mygerai_eo_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 hari

export type EventOrganizerSession = {
  organizerId: string;
  organizationName: string;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Buat sesi baru + set cookie. Hanya dipanggil dari Server Action (`src/server/event-organizers.ts`). */
export async function createEventOrganizerSession(
  organizerId: string,
): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db
    .insert(eoSessions)
    .values({ organizerId, tokenHash: hashToken(token), expiresAt });

  const cookieStore = await cookies();
  cookieStore.set(EO_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });
}

/** Baca & validasi sesi EO dari cookie. Aman dipanggil dari Server Component maupun Server Action. */
export async function getEventOrganizerSession(): Promise<EventOrganizerSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(EO_SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await db.query.eoSessions.findFirst({
    where: and(
      eq(eoSessions.tokenHash, hashToken(token)),
      gt(eoSessions.expiresAt, new Date()),
    ),
  });
  if (!session) return null;

  const organizer = await db.query.eventOrganizers.findFirst({
    where: eq(eventOrganizers.id, session.organizerId),
  });
  // Re-cek status tiap request, sama seperti getMerchantSession — EO yang
  // dinonaktifkan Admin otomatis kehilangan sesi lamanya.
  if (!organizer || organizer.status !== "approved") return null;

  return {
    organizerId: organizer.id,
    organizationName: organizer.organizationName,
  };
}

/** Hapus sesi (logout). Hanya dipanggil dari Server Action. */
export async function destroyEventOrganizerSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(EO_SESSION_COOKIE_NAME)?.value;
  if (token) {
    await db
      .delete(eoSessions)
      .where(eq(eoSessions.tokenHash, hashToken(token)));
  }
  cookieStore.delete(EO_SESSION_COOKIE_NAME);
}
