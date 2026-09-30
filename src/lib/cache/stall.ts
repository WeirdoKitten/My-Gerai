import { and, asc, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { revalidateTag, unstable_cache } from "next/cache";
import { db } from "@/lib/db/client";
import {
  merchants,
  products,
  productVariantGroups,
  productVariantOptions,
} from "@/lib/db/schema";
import type { ProductVariantGroupView } from "@/types/product";

/**
 * Cache lapisan data katalog Lapak (bagian yang jarang berubah: Item, varian,
 * info statis Lapak). Bagian yang bergantung waktu — status buka/tutup &
 * kunci tagihan — TETAP dihitung live di `getStallCatalog`, tidak di sini.
 * Invalidasi lewat cache tag saat Pedagang mengubah Item/varian/profil atau
 * saat stok berkurang (Pesanan dibayar). Lihat docs/ARSITEKTUR-SISTEM.md.
 */
export function stallTag(slug: string): string {
  return `stall-catalog:${slug}`;
}

export type CachedStallData = {
  merchantId: string;
  slug: string;
  stallName: string;
  category: string;
  photoUrl: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  products: Array<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    photoUrl: string | null;
    variantGroups: ProductVariantGroupView[];
  }>;
};

async function fetchVariantGroups(
  productIds: string[],
): Promise<Map<string, ProductVariantGroupView[]>> {
  if (productIds.length === 0) return new Map();
  const groups = await db.query.productVariantGroups.findMany({
    where: inArray(productVariantGroups.productId, productIds),
    orderBy: [asc(productVariantGroups.sortOrder)],
  });
  if (groups.length === 0) return new Map();

  const options = await db.query.productVariantOptions.findMany({
    where: inArray(
      productVariantOptions.groupId,
      groups.map((g) => g.id),
    ),
    orderBy: [asc(productVariantOptions.sortOrder)],
  });
  const optionsByGroup = new Map<string, typeof options>();
  for (const option of options) {
    const list = optionsByGroup.get(option.groupId) ?? [];
    list.push(option);
    optionsByGroup.set(option.groupId, list);
  }
  const byProduct = new Map<string, ProductVariantGroupView[]>();
  for (const group of groups) {
    const list = byProduct.get(group.productId) ?? [];
    list.push({
      id: group.id,
      name: group.name,
      options: (optionsByGroup.get(group.id) ?? []).map((o) => ({
        id: o.id,
        name: o.name,
        priceDelta: o.priceDelta,
      })),
    });
    byProduct.set(group.productId, list);
  }
  return byProduct;
}

async function fetchStallData(slug: string): Promise<CachedStallData | null> {
  const merchant = await db.query.merchants.findFirst({
    where: and(eq(merchants.slug, slug), eq(merchants.status, "approved")),
  });
  if (!merchant) return null;

  const merchantProducts = await db.query.products.findMany({
    where: and(
      eq(products.merchantId, merchant.id),
      eq(products.status, "available"),
      or(isNull(products.stock), gt(products.stock, 0)),
    ),
    orderBy: [asc(products.name)],
  });
  const variantGroups = await fetchVariantGroups(
    merchantProducts.map((p) => p.id),
  );

  return {
    merchantId: merchant.id,
    slug: merchant.slug,
    stallName: merchant.stallName,
    category: merchant.category,
    photoUrl: merchant.photoUrl,
    address: merchant.address,
    latitude: merchant.latitude,
    longitude: merchant.longitude,
    products: merchantProducts.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      photoUrl: p.photoUrl,
      variantGroups: variantGroups.get(p.id) ?? [],
    })),
  };
}

/** Data katalog Lapak dari cache (per-slug, di-tag `stall-catalog:<slug>`). */
export function getCachedStallData(
  slug: string,
): Promise<CachedStallData | null> {
  return unstable_cache(() => fetchStallData(slug), ["stall-catalog", slug], {
    tags: [stallTag(slug)],
  })();
}

/** Segarkan cache katalog satu slug. Dipanggil server action yang tahu slug-nya. */
export function revalidateStall(slug: string): void {
  revalidateTag(stallTag(slug), { expire: 0 });
}

/**
 * Segarkan cache katalog dari `merchantId` (mutasi Item/varian/stok cuma tahu
 * merchantId, bukan slug) — 1 query ringan by primary key.
 */
export async function revalidateStallByMerchantId(
  merchantId: string,
): Promise<void> {
  const merchant = await db.query.merchants.findFirst({
    where: eq(merchants.id, merchantId),
    columns: { slug: true },
  });
  if (merchant) revalidateTag(stallTag(merchant.slug), { expire: 0 });
}
