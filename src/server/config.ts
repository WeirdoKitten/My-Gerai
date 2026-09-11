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
const DEFAULT_SERVICE_FEE_BILLING_CYCLE_DAYS = 7;
const DEFAULT_SERVICE_FEE_GRACE_PERIOD_DAYS = 3;

/** Baca nilai `platform_config` aktif untuk satu `key`, atau `defaultValue` kalau belum pernah di-seed. */
async function readConfigValue(
  key: string,
  defaultValue: number,
): Promise<number> {
  const rows = await db.query.platformConfig.findMany({
    where: and(
      eq(platformConfig.key, key),
      lte(platformConfig.effectiveFrom, new Date()),
    ),
    orderBy: (row, { desc }) => [desc(row.effectiveFrom)],
    limit: 1,
  });
  return rows[0] ? Number(rows[0].value) : defaultValue;
}

/**
 * Nilai `platform_config` aktif saat ini. Kalau tabel belum di-seed sama
 * sekali, pakai default konstanta di atas supaya Pesanan tetap bisa dibuat.
 * Dipakai bareng alur Pembeli (`src/server/orders.ts`) & Admin — satu-satunya
 * sumber kebenaran, tidak diduplikasi.
 */
export async function getActivePlatformConfig(): Promise<PlatformConfigView> {
  const [
    platformFeeAmount,
    orderExpiryMinutes,
    serviceFeeBillingCycleDays,
    serviceFeeGracePeriodDays,
  ] = await Promise.all([
    readConfigValue("platform_fee_amount", DEFAULT_PLATFORM_FEE_AMOUNT),
    readConfigValue("order_expiry_minutes", DEFAULT_ORDER_EXPIRY_MINUTES),
    readConfigValue(
      "service_fee_billing_cycle_days",
      DEFAULT_SERVICE_FEE_BILLING_CYCLE_DAYS,
    ),
    readConfigValue(
      "service_fee_grace_period_days",
      DEFAULT_SERVICE_FEE_GRACE_PERIOD_DAYS,
    ),
  ]);

  return {
    platformFeeAmount,
    orderExpiryMinutes,
    serviceFeeBillingCycleDays,
    serviceFeeGracePeriodDays,
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
  if (
    parsed.data.serviceFeeBillingCycleDays !==
    current.serviceFeeBillingCycleDays
  ) {
    rows.push({
      key: "service_fee_billing_cycle_days",
      value: String(parsed.data.serviceFeeBillingCycleDays),
      effectiveFrom: now,
    });
  }
  if (
    parsed.data.serviceFeeGracePeriodDays !== current.serviceFeeGracePeriodDays
  ) {
    rows.push({
      key: "service_fee_grace_period_days",
      value: String(parsed.data.serviceFeeGracePeriodDays),
      effectiveFrom: now,
    });
  }

  if (rows.length === 0) {
    return { ok: true, message: "Tidak ada perubahan nilai." };
  }

  await db.insert(platformConfig).values(rows);
  return { ok: true };
}
