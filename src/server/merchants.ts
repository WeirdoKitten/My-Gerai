"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { getAdminSession } from "@/lib/auth/admin-session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  createMerchantSession,
  destroyMerchantSession,
  getMerchantSession,
} from "@/lib/auth/session";
import { isMerchantOrderingLocked } from "@/lib/billing/service-fee";
import { db } from "@/lib/db/client";
import { merchants } from "@/lib/db/schema";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMIT_MESSAGE,
} from "@/lib/rate-limit/limiter";
import { detectImage, saveQrisPhoto } from "@/lib/upload/storage";
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
import { getActivePlatformConfig } from "@/server/config";
import type {
  AdminMerchantView,
  ApproveMerchantResult,
  RejectMerchantResult,
  SetMerchantPaymentModeResult,
} from "@/types/admin";
import type {
  LoginMerchantResult,
  MerchantPaymentSettingsView,
  MerchantProfileView,
  QrMenuView,
  RegisterMerchantResult,
  UpdateMerchantProfileResult,
  UploadQrisPhotoResult,
} from "@/types/merchant";

const MAX_QRIS_PHOTO_BYTES = 3 * 1024 * 1024;

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
  const qrImageUrl = await QRCode.toDataURL(url);

  return { url, qrImageUrl };
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
