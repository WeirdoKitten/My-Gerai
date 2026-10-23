import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { merchants } from "@/lib/db/schema";
import { randomSlugSuffix, slugify } from "@/lib/utils/slug";

/**
 * Slug unik Lapak dari nama (suffix acak kalau bentrok). BUKAN Server Action:
 * dipakai pendaftaran Pedagang dan pembuatan Gerai Titipan oleh EO.
 */
export async function generateUniqueMerchantSlug(
  stallName: string,
): Promise<string> {
  const base = slugify(stallName) || "lapak";

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${randomSlugSuffix(4)}`;
    const existing = await db.query.merchants.findFirst({
      where: eq(merchants.slug, candidate),
      columns: { id: true },
    });
    if (!existing) return candidate;
  }
  return `${base}-${randomSlugSuffix(6)}`;
}
