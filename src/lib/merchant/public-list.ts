import { inArray, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { merchantOperatingHours } from "@/lib/db/schema";
import { fetchRatingSummaries } from "@/lib/review/queries";
import {
  evaluateSchedule,
  type OperatingHoursRow,
} from "@/lib/schedule/evaluate";
import { findNearestArea } from "@/lib/utils/geo";
import { listServiceAreas } from "@/server/service-areas";
import type { PublicMerchantListItem } from "@/types/merchant";

/*
 * BUKAN Server Action: dipakai bersama oleh daftar Gerai publik
 * (`src/server/merchants.ts`) dan anggota halaman event (`src/server/events.ts`).
 * Pemanggil wajib menyertakan `status = approved` di `where`.
 */

/** Gerai dalam bentuk publik (field aman saja), terbaru gabung duluan. */
export async function loadPublicMerchants(
  where: SQL | undefined,
  limit: number,
): Promise<PublicMerchantListItem[]> {
  const [rows, areas] = await Promise.all([
    db.query.merchants.findMany({
      where,
      orderBy: (row, { desc }) => [desc(row.createdAt)],
      limit,
    }),
    listServiceAreas(),
  ]);

  const merchantIds = rows.map((row) => row.id);
  const [hoursRows, ratingByMerchant] = await Promise.all([
    merchantIds.length > 0
      ? db.query.merchantOperatingHours.findMany({
          where: inArray(merchantOperatingHours.merchantId, merchantIds),
          columns: {
            merchantId: true,
            dayOfWeek: true,
            openTime: true,
            closeTime: true,
          },
        })
      : [],
    fetchRatingSummaries(merchantIds),
  ]);
  const hoursByMerchant = new Map<string, OperatingHoursRow[]>();
  for (const hour of hoursRows) {
    const list = hoursByMerchant.get(hour.merchantId) ?? [];
    list.push(hour);
    hoursByMerchant.set(hour.merchantId, list);
  }

  const now = new Date();

  return rows.map((row) => {
    const area =
      row.latitude != null && row.longitude != null
        ? findNearestArea(
            { latitude: row.latitude, longitude: row.longitude },
            areas,
          )
        : null;

    // Sama seperti getMerchantOpenState (src/lib/schedule/is-merchant-open.ts),
    // tapi dibatch di sini biar tidak query per-Lapak di daftar publik.
    const { isOpenBySchedule, segmentStart } = evaluateSchedule(
      hoursByMerchant.get(row.id) ?? [],
      now,
    );
    const overrideActive =
      !!row.manualOverride &&
      !!row.manualOverrideSetAt &&
      row.manualOverrideSetAt >= segmentStart;
    const isOpen = overrideActive
      ? row.manualOverride === "open"
      : isOpenBySchedule;

    return {
      slug: row.slug,
      stallName: row.stallName,
      category: row.category,
      photoUrl: row.photoUrl,
      latitude: row.latitude,
      longitude: row.longitude,
      areaId: area?.id ?? null,
      areaName: area?.name ?? null,
      isOpen,
      rating: ratingByMerchant.get(row.id) ?? { average: null, count: 0 },
    };
  });
}
