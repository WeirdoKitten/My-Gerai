import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { merchantOperatingHours, merchants } from "@/lib/db/schema";
import { evaluateSchedule, type OperatingHoursRow } from "./evaluate";

/**
 * Status buka/tutup Lapak saat ini — gabungan jadwal (`merchant_operating_hours`)
 * + override manual (`merchants.manualOverride`). Lazy, tanpa cron/job — pola
 * sama seperti `isMerchantOrderingLocked` (src/lib/billing/service-fee.ts).
 * Override hanya berlaku selama segmen jadwal yang sama saat dipasang; begitu
 * melewati batas jadwal berikutnya, otomatis kembali murni ikut jadwal.
 */
export async function getMerchantOpenState(
  merchantId: string,
  now: Date = new Date(),
): Promise<{ isOpen: boolean; reopensAt: Date | null }> {
  const [merchant, hours] = await Promise.all([
    db.query.merchants.findFirst({
      where: eq(merchants.id, merchantId),
      columns: { manualOverride: true, manualOverrideSetAt: true },
    }),
    db.query.merchantOperatingHours.findMany({
      where: eq(merchantOperatingHours.merchantId, merchantId),
      columns: { dayOfWeek: true, openTime: true, closeTime: true },
    }),
  ]);

  const { isOpenBySchedule, segmentStart, segmentEnd } = evaluateSchedule(
    hours as OperatingHoursRow[],
    now,
  );

  const overrideActive =
    !!merchant?.manualOverride &&
    !!merchant.manualOverrideSetAt &&
    merchant.manualOverrideSetAt >= segmentStart;

  const isOpen = overrideActive
    ? merchant?.manualOverride === "open"
    : isOpenBySchedule;

  return { isOpen, reopensAt: isOpen ? null : segmentEnd };
}
