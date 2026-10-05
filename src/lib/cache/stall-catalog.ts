import { createTtlCache, productionTtl } from "@/lib/cache/memory";
import type { StallCatalogView } from "@/types/product";

/**
 * Bagian katalog menu yang jarang berubah (profil Lapak + daftar Item +
 * varian), di-cache 15 dtk per slug. Status buka/tutup & kunci tagihan TIDAK
 * ikut di-cache — selalu dihitung per request di `getStallCatalog`.
 * `null` = slug tidak ada/belum `approved`. Dikosongkan oleh setiap Server
 * Action yang mengubah Item/varian/profil/status Lapak supaya Pedagang
 * langsung melihat perubahannya (docs/STRESS-TEST.md P2-3).
 */
export type CachedStallCatalog = {
  merchantId: string;
  merchant: Omit<StallCatalogView["merchant"], "isOpen" | "reopensAt">;
  products: StallCatalogView["products"];
};

export const stallCatalogCache = createTtlCache<
  string,
  CachedStallCatalog | null
>({ ttlMs: productionTtl(15_000), maxEntries: 1000 });

/** Panggil setelah perubahan apa pun yang tampil di halaman menu Pembeli. */
export function invalidateStallCatalogCache(): void {
  stallCatalogCache.clear();
}
