"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  createMerchantSession,
  destroyMerchantSession,
  getMerchantSession,
} from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { merchants } from "@/lib/db/schema";
import { randomSlugSuffix, slugify } from "@/lib/utils/slug";
import {
  type LoginMerchantInput,
  loginMerchantSchema,
  type RegisterMerchantInput,
  registerMerchantSchema,
} from "@/lib/validation/merchant.schema";
import type {
  LoginMerchantResult,
  QrLapakView,
  RegisterMerchantResult,
} from "@/types/merchant";

// Dihitung sekali saat modul dimuat — dipakai supaya waktu verifikasi login
// tetap konsisten walau nomor HP tidak terdaftar (cegah timing side-channel
// yang membocorkan nomor mana saja yang terdaftar).
const DUMMY_PASSWORD_HASH = hashPassword(
  "dummy-password-untuk-konsistensi-waktu",
);

const STATUS_MESSAGE_ID: Record<"pending" | "rejected" | "suspended", string> =
  {
    pending:
      "Pendaftaran Lapak kamu sedang ditinjau Admin. Silakan coba login lagi setelah disetujui.",
    rejected:
      "Pendaftaran Lapak kamu ditolak Admin. Hubungi Aplikator untuk info lebih lanjut.",
    suspended:
      "Akun Lapak kamu sedang dinonaktifkan Aplikator. Hubungi Aplikator untuk info lebih lanjut.",
  };

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
  const parsed = loginMerchantSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }
  const { phone, password } = parsed.data;

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
      message: STATUS_MESSAGE_ID[merchant.status],
    };
  }

  await createMerchantSession(merchant.id);
  return { ok: true, status: "approved" };
}

export async function logoutMerchant(): Promise<void> {
  await destroyMerchantSession();
  redirect("/login");
}

export async function getMerchantQrLapak(): Promise<QrLapakView | null> {
  const session = await getMerchantSession();
  if (!session) return null;

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const url = `${appUrl}/menu/${session.slug}`;
  const qrImageUrl = await QRCode.toDataURL(url);

  return { url, qrImageUrl };
}
