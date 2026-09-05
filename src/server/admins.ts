"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import {
  createAdminSession,
  destroyAdminSession,
} from "@/lib/auth/admin-session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { db } from "@/lib/db/client";
import { admins } from "@/lib/db/schema";
import {
  type LoginAdminInput,
  loginAdminSchema,
} from "@/lib/validation/admin.schema";
import type { LoginAdminResult } from "@/types/admin";

// Dihitung sekali saat modul dimuat — sama pola dengan loginMerchant, supaya
// waktu verifikasi login tetap konsisten walau nomor HP tidak terdaftar.
const DUMMY_PASSWORD_HASH = hashPassword(
  "dummy-password-untuk-konsistensi-waktu",
);

export async function loginAdmin(
  input: LoginAdminInput,
): Promise<LoginAdminResult> {
  const parsed = loginAdminSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }
  const { phone, password } = parsed.data;

  const admin = await db.query.admins.findFirst({
    where: eq(admins.phone, phone),
  });
  const passwordOk = await verifyPassword(
    password,
    admin?.passwordHash ?? (await DUMMY_PASSWORD_HASH),
  );

  if (!admin || !passwordOk) {
    return { ok: false, message: "Nomor HP atau password salah." };
  }

  await createAdminSession(admin.id);
  return { ok: true };
}

export async function logoutAdmin(): Promise<void> {
  await destroyAdminSession();
  redirect("/admin/login");
}
