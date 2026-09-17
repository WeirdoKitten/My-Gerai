"use server";

import { asc } from "drizzle-orm";
import { getAdminSession } from "@/lib/auth/admin-session";
import { db } from "@/lib/db/client";
import { serviceAreas } from "@/lib/db/schema";
import {
  type SaveServiceAreasInput,
  saveServiceAreasSchema,
} from "@/lib/validation/service-area.schema";
import type {
  SaveServiceAreasResult,
  ServiceAreaView,
} from "@/types/service-area";

/**
 * Semua Area Lapak -- PUBLIK, tanpa sesi (dipakai landing page & halaman
 * Admin). Nama+lokasi kasar area tidak sensitif, sama semangat
 * `listApprovedMerchants`.
 */
export async function listServiceAreas(): Promise<ServiceAreaView[]> {
  const rows = await db.query.serviceAreas.findMany({
    orderBy: [asc(serviceAreas.name)],
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    centerLatitude: row.centerLatitude,
    centerLongitude: row.centerLongitude,
    radiusKm: row.radiusKm,
  }));
}

/**
 * Ganti seluruh daftar Area Lapak sekaligus (replace-all) -- pola sama
 * `setMerchantOperatingHours`/`saveProductVariantGroups`. Admin-only.
 */
export async function saveServiceAreas(
  input: SaveServiceAreasInput,
): Promise<SaveServiceAreasResult> {
  const parsed = saveServiceAreasSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Data area tidak valid.",
    };
  }
  const session = await getAdminSession();
  if (!session) {
    return {
      ok: false,
      message: "Sesi Admin berakhir, silakan login kembali.",
    };
  }

  await db.transaction(async (tx) => {
    await tx.delete(serviceAreas);
    if (parsed.data.length > 0) {
      await tx.insert(serviceAreas).values(
        parsed.data.map((area) => ({
          name: area.name,
          centerLatitude: area.centerLatitude,
          centerLongitude: area.centerLongitude,
          radiusKm: area.radiusKm,
        })),
      );
    }
  });

  return { ok: true, message: "Area tersimpan." };
}
