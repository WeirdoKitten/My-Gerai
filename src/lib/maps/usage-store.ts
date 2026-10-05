import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mapApiUsage } from "@/lib/db/schema";
import { type MapSku, usageMonth } from "./usage";

/** Hitungan pemakaian bulan ini per SKU (tabel `map_api_usage`). */
export async function readMonthlyUsage(
  now: Date = new Date(),
): Promise<Partial<Record<MapSku, number>>> {
  const rows = await db
    .select({ sku: mapApiUsage.sku, count: mapApiUsage.count })
    .from(mapApiUsage)
    .where(eq(mapApiUsage.month, usageMonth(now)));
  return Object.fromEntries(rows.map((row) => [row.sku, row.count]));
}

/**
 * Catat satu pemakaian SKU lalu kembalikan `true` kalau hitungan baru masih
 * di dalam batas. Upsert atomik (`count + 1 ... RETURNING`), jadi request
 * bersamaan tidak bisa sama-sama lolos melewati batas.
 */
export async function consumeBudget(
  sku: MapSku,
  limit: number,
  now: Date = new Date(),
): Promise<boolean> {
  const [row] = await db
    .insert(mapApiUsage)
    .values({ month: usageMonth(now), sku, count: 1 })
    .onConflictDoUpdate({
      target: [mapApiUsage.month, mapApiUsage.sku],
      set: { count: sql`${mapApiUsage.count} + 1` },
    })
    .returning({ count: mapApiUsage.count });
  return row !== undefined && row.count <= limit;
}
