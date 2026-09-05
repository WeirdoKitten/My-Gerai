"use server";

import { and, eq, lte } from "drizzle-orm";
import { getAdminSession } from "@/lib/auth/admin-session";
import { db } from "@/lib/db/client";
import { platformConfig } from "@/lib/db/schema";
import {
  type UpdatePlatformConfigInput,
  updatePlatformConfigSchema,
} from "@/lib/validation/config.schema";
import type {
  PlatformConfigHistoryEntry,
  PlatformConfigView,
  UpdatePlatformConfigResult,
} from "@/types/config";

const DEFAULT_PLATFORM_FEE_AMOUNT = 1000;
const DEFAULT_ORDER_EXPIRY_MINUTES = 15;

/**
 * Nilai `platform_config` aktif saat ini. Kalau tabel belum di-seed sama
 * sekali, pakai default konstanta di atas supaya Pesanan tetap bisa dibuat.
 * Dipakai bareng alur Pembeli (`src/server/orders.ts`) & Admin — satu-satunya
 * sumber kebenaran, tidak diduplikasi.
 */
export async function getActivePlatformConfig(): Promise<PlatformConfigView> {
  const now = new Date();

  const feeRows = await db.query.platformConfig.findMany({
    where: and(
      eq(platformConfig.key, "platform_fee_amount"),
      lte(platformConfig.effectiveFrom, now),
    ),
    orderBy: (row, { desc }) => [desc(row.effectiveFrom)],
    limit: 1,
  });

  const expiryRows = await db.query.platformConfig.findMany({
    where: and(
      eq(platformConfig.key, "order_expiry_minutes"),
      lte(platformConfig.effectiveFrom, now),
    ),
    orderBy: (row, { desc }) => [desc(row.effectiveFrom)],
    limit: 1,
  });

  return {
    platformFeeAmount: feeRows[0]
      ? Number(feeRows[0].value)
      : DEFAULT_PLATFORM_FEE_AMOUNT,
    orderExpiryMinutes: expiryRows[0]
      ? Number(expiryRows[0].value)
      : DEFAULT_ORDER_EXPIRY_MINUTES,
  };
}

export async function getPlatformConfigHistory(): Promise<
  PlatformConfigHistoryEntry[]
> {
  const session = await getAdminSession();
  if (!session) return [];

  const rows = await db.query.platformConfig.findMany({
    orderBy: (row, { desc }) => [desc(row.effectiveFrom)],
  });

  return rows.map((row) => ({
    id: row.id,
    key: row.key,
    value: row.value,
    effectiveFrom: row.effectiveFrom,
  }));
}

export async function updatePlatformConfig(
  input: UpdatePlatformConfigInput,
): Promise<UpdatePlatformConfigResult> {
  const parsed = updatePlatformConfigSchema.safeParse(input);
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

  const current = await getActivePlatformConfig();
  const now = new Date();
  const rows: Array<{ key: string; value: string; effectiveFrom: Date }> = [];

  if (parsed.data.platformFeeAmount !== current.platformFeeAmount) {
    rows.push({
      key: "platform_fee_amount",
      value: String(parsed.data.platformFeeAmount),
      effectiveFrom: now,
    });
  }
  if (parsed.data.orderExpiryMinutes !== current.orderExpiryMinutes) {
    rows.push({
      key: "order_expiry_minutes",
      value: String(parsed.data.orderExpiryMinutes),
      effectiveFrom: now,
    });
  }

  if (rows.length === 0) {
    return { ok: true, message: "Tidak ada perubahan nilai." };
  }

  await db.insert(platformConfig).values(rows);
  return { ok: true };
}
