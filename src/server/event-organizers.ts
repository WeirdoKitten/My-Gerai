"use server";

import { and, count, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin-session";
import {
  createEventOrganizerSession,
  destroyEventOrganizerSession,
  getEventOrganizerSession,
} from "@/lib/auth/eo-session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { destroyMerchantSession, getMerchantSession } from "@/lib/auth/session";
import { invalidateStallCatalogCache } from "@/lib/cache/stall-catalog";
import { db } from "@/lib/db/client";
import { eventOrganizers, events, merchants } from "@/lib/db/schema";
import { invalidatePublicEventCache } from "@/lib/event/queries";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMIT_MESSAGE,
} from "@/lib/rate-limit/limiter";
import { detectImage, saveQrisPhoto } from "@/lib/upload/storage";
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
  EventOrganizerQrisView,
  LoginEventOrganizerResult,
  RegisterEventOrganizerResult,
  UploadEventOrganizerQrisResult,
} from "@/types/event";

const MAX_QRIS_PHOTO_BYTES = 3 * 1024 * 1024;

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
  // Sesi "Kelola" Gerai Titipan milik EO ini (cookie Pedagang) ikut dicabut,
  // supaya orang berikutnya di browser yang sama tidak bisa membuka
  // dashboard Gerai itu (mis. mengubah rekening pencairan).
  const [eoSession, merchantSession] = await Promise.all([
    getEventOrganizerSession(),
    getMerchantSession(),
  ]);
  if (
    eoSession &&
    merchantSession?.proxyOrganizerId === eoSession.organizerId
  ) {
    await destroyMerchantSession();
  }
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

/** QRIS "uang jasa titipan" EO sendiri (portal EO) — identitas dari sesi. */
export async function getMyEventOrganizerQris(): Promise<EventOrganizerQrisView | null> {
  const session = await getEventOrganizerSession();
  if (!session) return null;

  const organizer = await db.query.eventOrganizers.findFirst({
    where: eq(eventOrganizers.id, session.organizerId),
    columns: { qrisPhotoUrl: true },
  });
  return { qrisPhotoUrl: organizer?.qrisPhotoUrl ?? null };
}

/**
 * Unggah/ganti foto QRIS "uang jasa titipan" EO (2026-10-23). Langsung aktif
 * tanpa pemeriksaan Admin (keputusan User) dan disalin ke semua Gerai Titipan
 * EO ini dalam satu transaksi — Pembeli Gerai Titipan membayar langsung ke
 * QRIS ini (`payment_mode = qris_pribadi`).
 */
export async function uploadEventOrganizerQris(
  formData: FormData,
): Promise<UploadEventOrganizerQrisResult> {
  const session = await getEventOrganizerSession();
  if (!session) {
    return { ok: false, message: "Sesi EO berakhir, silakan login kembali." };
  }

  if (
    !checkRateLimit(`upload-eo-qris:${session.organizerId}`, 10, 10 * 60_000)
  ) {
    return { ok: false, message: RATE_LIMIT_MESSAGE };
  }

  const file = formData.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return { ok: false, message: "Tidak ada file foto." };
  }
  if (file.size > MAX_QRIS_PHOTO_BYTES) {
    return { ok: false, message: "Ukuran foto maksimal 3 MB." };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = detectImage(bytes);
  if (!ext) {
    return { ok: false, message: "Format foto harus JPG, PNG, atau WebP." };
  }

  const url = await saveQrisPhoto(bytes, ext);
  await db.transaction(async (tx) => {
    await tx
      .update(eventOrganizers)
      .set({ qrisPhotoUrl: url })
      .where(eq(eventOrganizers.id, session.organizerId));
    await tx
      .update(merchants)
      .set({ qrisPhotoUrl: url, paymentMode: "qris_pribadi" })
      .where(eq(merchants.managedByOrganizerId, session.organizerId));
  });

  invalidateStallCatalogCache();
  invalidatePublicEventCache();
  return { ok: true, url };
}
