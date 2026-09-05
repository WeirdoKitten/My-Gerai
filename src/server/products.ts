"use server";

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { merchants, products } from "@/lib/db/schema";
import type { StallCatalogView } from "@/types/product";

/** Katalog publik sebuah Lapak — null kalau slug tidak ada atau belum `approved`. */
export async function getStallCatalog(
  slug: string,
): Promise<StallCatalogView | null> {
  const merchant = await db.query.merchants.findFirst({
    where: and(eq(merchants.slug, slug), eq(merchants.status, "approved")),
  });

  if (!merchant) return null;

  const merchantProducts = await db.query.products.findMany({
    where: and(
      eq(products.merchantId, merchant.id),
      eq(products.status, "available"),
    ),
    orderBy: [asc(products.name)],
  });

  return {
    merchant: {
      slug: merchant.slug,
      stallName: merchant.stallName,
      category: merchant.category,
      photoUrl: merchant.photoUrl,
    },
    products: merchantProducts.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      photoUrl: product.photoUrl,
    })),
  };
}
