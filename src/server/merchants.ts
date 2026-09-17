"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin-session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  createMerchantSession,
  destroyMerchantSession,
  getMerchantSession,
} from "@/lib/auth/session";
import { isMerchantOrderingLocked } from "@/lib/billing/service-fee";
import { db } from "@/lib/db/client";
import { merchantOperatingHours, merchants } from "@/lib/db/schema";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMIT_MESSAGE,
} from "@/lib/rate-limit/limiter";
import { getMerchantOpenState } from "@/lib/schedule/is-merchant-open";
import { detectImage, saveQrisPhoto } from "@/lib/upload/storage";
import { buildMenuQrPoster } from "@/lib/utils/qr-poster";
import { randomSlugSuffix, slugify } from "@/lib/utils/slug";
import {
  type ApproveMerchantInput,
  approveMerchantSchema,
  type LoginMerchantInput,
  loginMerchantSchema,
  type RegisterMerchantInput,
  type RejectMerchantInput,
  registerMerchantSchema,
  rejectMerchantSchema,
  type SetMerchantPaymentModeInput,
  setMerchantPaymentModeSchema,
  type UpdateMerchantProfileInput,
  updateMerchantProfileSchema,
} from "@/lib/validation/merchant.schema";
import {
  type SetOperatingHoursInput,
  setOperatingHoursSchema,
} from "@/lib/validation/merchant-hours.schema";
import { getActivePlatformConfig } from "@/server/config";
import type {
  AdminMerchantView,
  ApproveMerchantResult,
  RejectMerchantResult,
  SetMerchantPaymentModeResult,
} from "@/types/admin";
import type {
  LoginMerchantResult,
  MerchantOpenStatusView,
  MerchantPaymentSettingsView,
  MerchantProfileView,
  PublicMerchantListItem,
  QrMenuView,
  RegisterMerchantResult,
  SetOperatingHoursResult,
  ToggleMerchantOpenResult,
  UpdateMerchantProfileResult,
  UploadQrisPhotoResult,
} from "@/types/merchant";

const MAX_QRIS_PHOTO_BYTES = 3 * 1024 * 1024;

/** Batas jumlah Lapak ditampilkan di showcase landing page (skala kaki lima — KISS). */
const PUBLIC_SHOWCASE_LIMIT = 12;

// Dihitung sekali saat modul dimuat — dipakai supaya waktu verifikasi login
// tetap konsisten walau nomor HP tidak terdaftar (cegah timing side-channel
// yang membocorkan nomor mana saja yang terdaftar).
const DUMMY_PASSWORD_HASH = hashPassword(
  "dummy-password-untuk-konsistensi-waktu",
);

/** Pesan status non-approved untuk Pedagang saat login — `rejected` menyertakan alasan asli dari Admin. */
function buildStatusMessage(
  status: "pending" | "rejected" | "suspended",
  rejectionReason: string | null,
): string {
  switch (status) {
    case "pending":
      return "Pendaftaran Lapak kamu sedang ditinjau Admin. Silakan coba login lagi setelah disetujui.";
    case "rejected":
      return rejectionReason
        ? `Pendaftaran Lapak kamu ditolak Admin. Alasan: ${rejectionReason}`
        : "Pendaftaran Lapak kamu ditolak Admin. Hubungi Aplikator untuk info lebih lanjut.";
    case "suspended":
      return "Akun Lapak kamu sedang dinonaktifkan Aplikator. Hubungi Aplikator untuk info lebih lanjut.";
  }
}

async function generateUniqueSlug(stallName: string): Promise<string> {
  const base = slugify(stallName) || "lapak";

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${randomSlugSuffix(4)}`;
    const existing = await db.query.merchants.findFirst({
      where: eq(merchants.slug, candidate),
    });
    if (!existing) return candidate;
  }
  return `${base}-${randomSlugSuffix(6)}`;
}

export async function registerMerchant(
  input: RegisterMerchantInput,
): Promise<RegisterMerchantResult> {
  const ip = await getClientIp();
  if (!checkRateLimit(`register-merchant:ip:${ip}`, 5, 60 * 60_000)) {
    return { ok: false, message: RATE_LIMIT_MESSAGE };
  }

  const parsed = registerMerchantSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }
  const { stallName, ownerName, category, phone, password } = parsed.data;

  const existingPhone = await db.query.merchants.findFirst({
    where: eq(merchants.phone, phone),
  });
  if (existingPhone) {
    return { ok: false, message: "Nomor HP sudah terdaftar." };
  }

  const passwordHash = await hashPassword(password);
  const slug = await generateUniqueSlug(stallName);

  await db.insert(merchants).values({
    slug,
    stallName,
    ownerName,
    category,
    phone,
    passwordHash,
    status: "pending",
  });

  return {
    ok: true,
    message:
      "Pendaftaran berhasil! Lapak kamu akan aktif setelah disetujui Admin.",
  };
}

export async function loginMerchant(
  input: LoginMerchantInput,
): Promise<LoginMerchantResult> {
  const ip = await getClientIp();
  if (!checkRateLimit(`login-merchant:ip:${ip}`, 5, 5 * 60_000)) {
    return { ok: false, message: RATE_LIMIT_MESSAGE };
  }

  const parsed = loginMerchantSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }
  const { phone, password } = parsed.data;

  if (!checkRateLimit(`login-merchant:phone:${phone}`, 5, 5 * 60_000)) {
    return { ok: false, message: RATE_LIMIT_MESSAGE };
  }

  const merchant = await db.query.merchants.findFirst({
    where: eq(merchants.phone, phone),
  });
  const passwordOk = await verifyPassword(
    password,
    merchant?.passwordHash ?? (await DUMMY_PASSWORD_HASH),
  );

  if (!merchant || !passwordOk) {
    return { ok: false, message: "Nomor HP atau password salah." };
  }

  if (merchant.status !== "approved") {
    return {
      ok: true,
      status: merchant.status,
      message: buildStatusMessage(merchant.status, merchant.rejectionReason),
    };
  }

  await createMerchantSession(merchant.id);
  return { ok: true, status: "approved" };
}

export async function logoutMerchant(): Promise<void> {
  await destroyMerchantSession();
  redirect("/login");
}

export async function getMerchantProfile(): Promise<MerchantProfileView | null> {
  const session = await getMerchantSession();
  if (!session) return null;

  const merchant = await db.query.merchants.findFirst({
    where: eq(merchants.id, session.merchantId),
  });
  if (!merchant) return null;

  return {
    stallName: merchant.stallName,
    ownerName: merchant.ownerName,
    category: merchant.category,
    phone: merchant.phone,
    payoutAccountInfo: merchant.payoutAccountInfo,
    latitude: merchant.latitude,
    longitude: merchant.longitude,
  };
}

export async function updateMerchantProfile(
  input: UpdateMerchantProfileInput,
): Promise<UpdateMerchantProfileResult> {
  const session = await getMerchantSession();
  if (!session)
    return { ok: false, message: "Sesi berakhir, silakan login kembali." };

  const parsed = updateMerchantProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }

  await db
    .update(merchants)
    .set({
      stallName: parsed.data.stallName,
      ownerName: parsed.data.ownerName,
      category: parsed.data.category,
      payoutAccountInfo: parsed.data.payoutAccountInfo || null,
      latitude: parsed.data.latitude ?? null,
      longitude: parsed.data.longitude ?? null,
    })
    .where(eq(merchants.id, session.merchantId));

  return { ok: true, message: "Profil diperbarui." };
}

/** Pengaturan pembayaran Lapak sendiri (`/dashboard/pembayaran`) — identitas dari sesi login. */
export async function getMerchantPaymentSettings(): Promise<MerchantPaymentSettingsView | null> {
  const session = await getMerchantSession();
  if (!session) return null;

  const merchant = await db.query.merchants.findFirst({
    where: eq(merchants.id, session.merchantId),
  });
  if (!merchant) return null;

  const { serviceFeeGracePeriodDays } = await getActivePlatformConfig();
  const storefrontLocked = await isMerchantOrderingLocked(
    merchant.id,
    serviceFeeGracePeriodDays,
  );

  return {
    paymentMode: merchant.paymentMode,
    qrisPhotoUrl: merchant.qrisPhotoUrl,
    storefrontLocked,
  };
}

/** Status buka/tutup + jadwal Lapak sendiri (`/dashboard/jadwal`) — identitas dari sesi login. */
export async function getMerchantOpenStatus(): Promise<MerchantOpenStatusView | null> {
  const session = await getMerchantSession();
  if (!session) return null;

  const [merchant, { isOpen, reopensAt }, hours] = await Promise.all([
    db.query.merchants.findFirst({
      where: eq(merchants.id, session.merchantId),
      columns: { manualOverride: true },
    }),
    getMerchantOpenState(session.merchantId),
    db.query.merchantOperatingHours.findMany({
      where: eq(merchantOperatingHours.merchantId, session.merchantId),
      columns: { dayOfWeek: true, openTime: true, closeTime: true },
    }),
  ]);
  if (!merchant) return null;

  return {
    isOpen,
    manualOverride: merchant.manualOverride,
    reopensAt: reopensAt ? reopensAt.toISOString() : null,
    hours: hours.map((h) => ({
      dayOfWeek: h.dayOfWeek,
      openTime: h.openTime.slice(0, 5),
      closeTime: h.closeTime.slice(0, 5),
    })),
  };
}

/**
 * Override manual status buka/tutup — berlaku sampai batas jadwal berikutnya
 * berlalu (lihat getMerchantOpenState), kalau Lapak sudah punya jadwal.
 * Kalau belum punya jadwal sama sekali, berlaku terus sampai diubah lagi.
 */
export async function toggleMerchantOpen(
  nextState: "open" | "closed",
): Promise<ToggleMerchantOpenResult> {
  const session = await getMerchantSession();
  if (!session)
    return { ok: false, message: "Sesi berakhir, silakan login kembali." };

  await db
    .update(merchants)
    .set({ manualOverride: nextState, manualOverrideSetAt: new Date() })
    .where(eq(merchants.id, session.merchantId));

  return { ok: true };
}

/** Ganti seluruh jadwal operasional Lapak sendiri — replace-all (hapus semua baris lama, insert baris baru). */
export async function setMerchantOperatingHours(
  input: SetOperatingHoursInput,
): Promise<SetOperatingHoursResult> {
  const session = await getMerchantSession();
  if (!session)
    return { ok: false, message: "Sesi berakhir, silakan login kembali." };

  const parsed = setOperatingHoursSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Jadwal tidak valid.",
    };
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(merchantOperatingHours)
      .where(eq(merchantOperatingHours.merchantId, session.merchantId));
    if (parsed.data.length > 0) {
      await tx.insert(merchantOperatingHours).values(
        parsed.data.map((row) => ({
          merchantId: session.merchantId,
          dayOfWeek: row.dayOfWeek,
          openTime: row.openTime,
          closeTime: row.closeTime,
        })),
      );
    }
  });

  return { ok: true, message: "Jadwal operasional disimpan." };
}

/**
 * Unggah foto QRIS pribadi Pedagang — validasi & simpan langsung dalam satu
 * langkah (beda dari upload foto Item: di sana klien menahan URL di form
 * dulu untuk digabung dengan field lain saat submit; di sini tidak ada
 * field lain untuk digabung, jadi upload = tersimpan). `paymentMode` TIDAK
 * ikut berubah di sini — itu murni wewenang Admin (setMerchantPaymentMode).
 */
export async function uploadQrisPhoto(
  formData: FormData,
): Promise<UploadQrisPhotoResult> {
  const session = await getMerchantSession();
  if (!session)
    return { ok: false, message: "Sesi berakhir, silakan login kembali." };

  if (!checkRateLimit(`upload-qris:${session.merchantId}`, 30, 10 * 60_000)) {
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
  await db
    .update(merchants)
    .set({ qrisPhotoUrl: url })
    .where(eq(merchants.id, session.merchantId));

  return { ok: true, url };
}

export async function getMerchantQrMenu(): Promise<QrMenuView | null> {
  const session = await getMerchantSession();
  if (!session) return null;

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const url = `${appUrl}/menu/${session.slug}`;
  const qrImageUrl = await buildMenuQrPoster(url, session.stallName);

  return { url, qrImageUrl };
}

/**
 * Lapak yang sudah disetujui — showcase publik di landing page, TANPA sesi.
 * Terbaru gabung duluan, dibatasi {@link PUBLIC_SHOWCASE_LIMIT}. Field
 * dibatasi ketat (lihat `PublicMerchantListItem`) — tidak ada phone/alamat/
 * status internal, cuma yang aman dilihat siapa saja.
 */
export async function listApprovedMerchants(): Promise<
  PublicMerchantListItem[]
> {
  const rows = await db.query.merchants.findMany({
    where: eq(merchants.status, "approved"),
    orderBy: (row, { desc }) => [desc(row.createdAt)],
    limit: PUBLIC_SHOWCASE_LIMIT,
  });

  return rows.map((row) => ({
    slug: row.slug,
    stallName: row.stallName,
    category: row.category,
    photoUrl: row.photoUrl,
    latitude: row.latitude,
    longitude: row.longitude,
  }));
}

/** Semua Pedagang (untuk panel Admin) — otorisasi via sesi Admin. */
export async function listMerchantsForAdmin(): Promise<AdminMerchantView[]> {
  const session = await getAdminSession();
  if (!session) return [];

  const rows = await db.query.merchants.findMany({
    orderBy: (row, { desc }) => [desc(row.createdAt)],
  });

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    stallName: row.stallName,
    ownerName: row.ownerName,
    category: row.category,
    phone: row.phone,
    status: row.status,
    rejectionReason: row.rejectionReason,
    createdAt: row.createdAt,
    paymentMode: row.paymentMode,
    qrisPhotoUrl: row.qrisPhotoUrl,
  }));
}

/**
 * Ganti metode pembayaran sebuah Lapak — HANYA Admin (keputusan User: bukan
 * self-service Pedagang, supaya Admin bisa memverifikasi dulu foto QRIS yang
 * diunggah sebelum benar-benar mengaktifkan mode `qris_pribadi`).
 */
export async function setMerchantPaymentMode(
  input: SetMerchantPaymentModeInput,
): Promise<SetMerchantPaymentModeResult> {
  const parsed = setMerchantPaymentModeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Data tidak valid." };
  }
  const session = await getAdminSession();
  if (!session) {
    return {
      ok: false,
      message: "Sesi Admin berakhir, silakan login kembali.",
    };
  }

  const merchant = await db.query.merchants.findFirst({
    where: eq(merchants.id, parsed.data.merchantId),
  });
  if (!merchant) {
    return { ok: false, message: "Pedagang tidak ditemukan." };
  }
  if (parsed.data.paymentMode === "qris_pribadi" && !merchant.qrisPhotoUrl) {
    return {
      ok: false,
      message: "Pedagang belum mengunggah foto QRIS pribadi.",
    };
  }

  await db
    .update(merchants)
    .set({ paymentMode: parsed.data.paymentMode })
    .where(eq(merchants.id, parsed.data.merchantId));

  return { ok: true };
}

export async function approveMerchant(
  input: ApproveMerchantInput,
): Promise<ApproveMerchantResult> {
  const parsed = approveMerchantSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Data tidak valid." };
  }
  const session = await getAdminSession();
  if (!session) {
    return {
      ok: false,
      message: "Sesi Admin berakhir, silakan login kembali.",
    };
  }

  const [updated] = await db
    .update(merchants)
    .set({ status: "approved", rejectionReason: null })
    .where(
      and(
        eq(merchants.id, parsed.data.merchantId),
        eq(merchants.status, "pending"),
      ),
    )
    .returning();

  if (!updated) {
    return {
      ok: false,
      message: "Pedagang ini sudah tidak berstatus menunggu persetujuan.",
    };
  }
  return { ok: true };
}

export async function rejectMerchant(
  input: RejectMerchantInput,
): Promise<RejectMerchantResult> {
  const parsed = rejectMerchantSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }
  const session = await getAdminSession();
  if (!session) {
    return {
      ok: false,
      message: "Sesi Admin berakhir, silakan login kembali.",
    };
  }

  const [updated] = await db
    .update(merchants)
    .set({ status: "rejected", rejectionReason: parsed.data.reason })
    .where(
      and(
        eq(merchants.id, parsed.data.merchantId),
        eq(merchants.status, "pending"),
      ),
    )
    .returning();

  if (!updated) {
    return {
      ok: false,
      message: "Pedagang ini sudah tidak berstatus menunggu persetujuan.",
    };
  }
  return { ok: true };
}
