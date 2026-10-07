import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { db } from "@/lib/db/client";
import { merchants } from "@/lib/db/schema";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit/limiter";
import {
  type LoginMerchantInput,
  loginMerchantSchema,
} from "@/lib/validation/merchant.schema";

/*
 * BUKAN Server Action (`"use server"`): kalau diekspor dari file action,
 * fungsi ini jadi RPC publik. Dipakai bersama oleh `loginMerchant` (web,
 * cookie) dan `POST /api/mobile/v1/auth/login` (aplikasi, Bearer token).
 */

// Dihitung sekali saat modul dimuat — dipakai supaya waktu verifikasi login
// tetap konsisten walau nomor HP tidak terdaftar (cegah timing side-channel
// yang membocorkan nomor mana saja yang terdaftar).
const DUMMY_PASSWORD_HASH = hashPassword(
  "dummy-password-untuk-konsistensi-waktu",
);

export type MerchantAuthResult =
  | { ok: true; status: "approved"; merchantId: string }
  | { ok: true; status: "pending" | "rejected" | "suspended"; message: string }
  | { ok: false; message: string };

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

/** Cek No. HP + password (dengan rate limit per IP dan per No. HP). Tidak membuat sesi. */
export async function authenticateMerchant(
  input: LoginMerchantInput,
  ip: string,
): Promise<MerchantAuthResult> {
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

  return { ok: true, status: "approved", merchantId: merchant.id };
}
