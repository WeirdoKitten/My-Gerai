"use server";

import { and, count, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin-session";
import {
  createEventOrganizerSession,
  destroyEventOrganizerSession,
} from "@/lib/auth/eo-session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { db } from "@/lib/db/client";
import { eventOrganizers, events } from "@/lib/db/schema";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMIT_MESSAGE,
} from "@/lib/rate-limit/limiter";
import {
  approveEventOrganizerSchema,
  type LoginEventOrganizerInput,
  loginEventOrganizerSchema,
  type RegisterEventOrganizerInput,
  registerEventOrganizerSchema,
  rejectEventOrganizerSchema,
} from "@/lib/validation/event.schema";
import type {
  AdminEventOrganizerView,
  EventOrganizerActionResult,
  LoginEventOrganizerResult,
  RegisterEventOrganizerResult,
} from "@/types/event";

// Sama seperti loginMerchant: waktu verifikasi tetap konsisten walau nomor
// HP tidak terdaftar (cegah timing side-channel).
const DUMMY_PASSWORD_HASH = hashPassword(
  "dummy-password-untuk-konsistensi-waktu",
);

function buildStatusMessage(
  status: "pending" | "rejected" | "suspended",
  rejectionReason: string | null,
): string {
  switch (status) {
    case "pending":
      return "Pendaftaran EO kamu sedang ditinjau Admin. Silakan coba login lagi setelah disetujui.";
    case "rejected":
      return rejectionReason
        ? `Pendaftaran EO kamu ditolak Admin. Alasan: ${rejectionReason}`
        : "Pendaftaran EO kamu ditolak Admin. Hubungi Aplikator untuk info lebih lanjut.";
    case "suspended":
      return "Akun EO kamu sedang dinonaktifkan Aplikator. Hubungi Aplikator untuk info lebih lanjut.";
  }
}

export async function registerEventOrganizer(
  input: RegisterEventOrganizerInput,
): Promise<RegisterEventOrganizerResult> {
  const ip = await getClientIp();
  if (!checkRateLimit(`register-eo:ip:${ip}`, 5, 60 * 60_000)) {
    return { ok: false, message: RATE_LIMIT_MESSAGE };
  }

  const parsed = registerEventOrganizerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }
  const { organizationName, contactName, phone, password } = parsed.data;

  const existing = await db.query.eventOrganizers.findFirst({
    where: eq(eventOrganizers.phone, phone),
    columns: { id: true },
  });
  if (existing) {
    return { ok: false, message: "Nomor HP sudah terdaftar sebagai EO." };
  }

  await db.insert(eventOrganizers).values({
    organizationName,
    contactName,
    phone,
    passwordHash: await hashPassword(password),
    status: "pending",
  });

  return {
    ok: true,
    message:
      "Pendaftaran berhasil! Akun EO kamu akan aktif setelah disetujui Admin.",
  };
}

export async function loginEventOrganizer(
  input: LoginEventOrganizerInput,
): Promise<LoginEventOrganizerResult> {
  const ip = await getClientIp();
  if (!checkRateLimit(`login-eo:ip:${ip}`, 5, 5 * 60_000)) {
    return { ok: false, message: RATE_LIMIT_MESSAGE };
  }

  const parsed = loginEventOrganizerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }
  const { phone, password } = parsed.data;

  if (!checkRateLimit(`login-eo:phone:${phone}`, 5, 5 * 60_000)) {
    return { ok: false, message: RATE_LIMIT_MESSAGE };
  }

  const organizer = await db.query.eventOrganizers.findFirst({
    where: eq(eventOrganizers.phone, phone),
  });
  const passwordOk = await verifyPassword(
    password,
    organizer?.passwordHash ?? (await DUMMY_PASSWORD_HASH),
  );
  if (!organizer || !passwordOk) {
    return { ok: false, message: "Nomor HP atau password salah." };
  }

  if (organizer.status !== "approved") {
    return {
      ok: true,
      status: organizer.status,
      message: buildStatusMessage(organizer.status, organizer.rejectionReason),
    };
  }

  await createEventOrganizerSession(organizer.id);
  return { ok: true, status: "approved" };
}

export async function logoutEventOrganizer(): Promise<void> {
  await destroyEventOrganizerSession();
  redirect("/eo/login");
}

/** Semua EO (untuk panel Admin) — otorisasi via sesi Admin. */
export async function listEventOrganizersForAdmin(): Promise<
  AdminEventOrganizerView[]
> {
  const session = await getAdminSession();
  if (!session) return [];

  const [rows, eventCounts] = await Promise.all([
    db.query.eventOrganizers.findMany({
      orderBy: (row, { desc }) => [desc(row.createdAt)],
    }),
    db
      .select({ organizerId: events.organizerId, total: count() })
      .from(events)
      .groupBy(events.organizerId),
  ]);
  const countByOrganizer = new Map(
    eventCounts.map((row) => [row.organizerId, row.total]),
  );

  return rows.map((row) => ({
    id: row.id,
    organizationName: row.organizationName,
    contactName: row.contactName,
    phone: row.phone,
    status: row.status,
    rejectionReason: row.rejectionReason,
    createdAt: row.createdAt,
    eventCount: countByOrganizer.get(row.id) ?? 0,
  }));
}

export async function approveEventOrganizer(input: {
  organizerId: string;
}): Promise<EventOrganizerActionResult> {
  const parsed = approveEventOrganizerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Data tidak valid." };
  if (!(await getAdminSession())) {
    return {
      ok: false,
      message: "Sesi Admin berakhir, silakan login kembali.",
    };
  }

  const [updated] = await db
    .update(eventOrganizers)
    .set({ status: "approved", rejectionReason: null })
    .where(
      and(
        eq(eventOrganizers.id, parsed.data.organizerId),
        eq(eventOrganizers.status, "pending"),
      ),
    )
    .returning({ id: eventOrganizers.id });
  if (!updated) {
    return {
      ok: false,
      message: "EO ini sudah tidak berstatus menunggu persetujuan.",
    };
  }
  return { ok: true };
}

export async function rejectEventOrganizer(input: {
  organizerId: string;
  reason: string;
}): Promise<EventOrganizerActionResult> {
  const parsed = rejectEventOrganizerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }
  if (!(await getAdminSession())) {
    return {
      ok: false,
      message: "Sesi Admin berakhir, silakan login kembali.",
    };
  }

  const [updated] = await db
    .update(eventOrganizers)
    .set({ status: "rejected", rejectionReason: parsed.data.reason })
    .where(
      and(
        eq(eventOrganizers.id, parsed.data.organizerId),
        eq(eventOrganizers.status, "pending"),
      ),
    )
    .returning({ id: eventOrganizers.id });
  if (!updated) {
    return {
      ok: false,
      message: "EO ini sudah tidak berstatus menunggu persetujuan.",
    };
  }
  return { ok: true };
}
