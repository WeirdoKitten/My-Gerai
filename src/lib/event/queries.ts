import { and, asc, eq } from "drizzle-orm";
import { createTtlCache, productionTtl } from "@/lib/cache/memory";
import { db } from "@/lib/db/client";
import { eventMerchants, events, merchants } from "@/lib/db/schema";

/**
 * Event publik per slug (data mentah + slug Gerai anggota berurutan), di-cache
 * 15 dtk — dibaca tiap peserta membuka halaman event. Dikosongkan oleh setiap
 * Server Action EO yang mengubah event. `null` = slug tidak ada.
 */
export type CachedPublicEvent = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  location: string | null;
  isActive: boolean;
  merchantSlugs: string[];
};

export const publicEventCache = createTtlCache<
  string,
  CachedPublicEvent | null
>({ ttlMs: productionTtl(15_000), maxEntries: 500 });

export function invalidatePublicEventCache(): void {
  publicEventCache.clear();
}

export function loadPublicEvent(
  slug: string,
): Promise<CachedPublicEvent | null> {
  return publicEventCache.get(slug, async () => {
    const event = await db.query.events.findFirst({
      where: eq(events.slug, slug),
    });
    if (!event) return null;

    const members = await db
      .select({ slug: merchants.slug })
      .from(eventMerchants)
      .innerJoin(merchants, eq(merchants.id, eventMerchants.merchantId))
      .where(eq(eventMerchants.eventId, event.id))
      .orderBy(asc(eventMerchants.sortOrder));

    return {
      id: event.id,
      slug: event.slug,
      name: event.name,
      description: event.description,
      location: event.location,
      isActive: event.isActive,
      merchantSlugs: members.map((member) => member.slug),
    };
  });
}

/**
 * Atribusi Pesanan ke event saat checkout: event harus ada, aktif, dan Gerai
 * masih anggotanya. Selain itu `null` — Pesanan tetap dibuat sebagai Pesanan
 * biasa (tidak menambah friksi Pembeli kalau event baru saja dinonaktifkan).
 */
export async function resolveOrderEventId(
  eventSlug: string,
  merchantId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ id: events.id })
    .from(events)
    .innerJoin(eventMerchants, eq(eventMerchants.eventId, events.id))
    .where(
      and(
        eq(events.slug, eventSlug),
        eq(events.isActive, true),
        eq(eventMerchants.merchantId, merchantId),
      ),
    )
    .limit(1);
  return row?.id ?? null;
}
