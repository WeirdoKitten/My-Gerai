"use server";

import { and, asc, eq, inArray } from "drizzle-orm";
import { getMerchantSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import {
  products,
  productVariantGroups,
  productVariantOptions,
} from "@/lib/db/schema";
import {
  type SaveProductVariantGroupsInput,
  saveProductVariantGroupsSchema,
} from "@/lib/validation/product-variant.schema";
import type {
  ProductVariantGroupView,
  SaveProductVariantGroupsResult,
} from "@/types/product";

/** Grup varian + pilihannya milik sebuah Item — dipakai isi form `ProductForm` (lewat `ProductVariantEditor`). */
export async function getProductVariantGroups(
  productId: string,
): Promise<ProductVariantGroupView[]> {
  const session = await getMerchantSession();
  if (!session) return [];

  const product = await db.query.products.findFirst({
    where: and(
      eq(products.id, productId),
      eq(products.merchantId, session.merchantId),
    ),
    columns: { id: true },
  });
  if (!product) return [];

  const groups = await db.query.productVariantGroups.findMany({
    where: eq(productVariantGroups.productId, productId),
    orderBy: [asc(productVariantGroups.sortOrder)],
  });
  if (groups.length === 0) return [];

  const groupIds = groups.map((group) => group.id);
  const options = await db.query.productVariantOptions.findMany({
    where: inArray(productVariantOptions.groupId, groupIds),
    orderBy: [asc(productVariantOptions.sortOrder)],
  });
  const optionsByGroupId = new Map<string, typeof options>();
  for (const option of options) {
    const list = optionsByGroupId.get(option.groupId) ?? [];
    list.push(option);
    optionsByGroupId.set(option.groupId, list);
  }

  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    options: (optionsByGroupId.get(group.id) ?? []).map((option) => ({
      id: option.id,
      name: option.name,
      priceDelta: option.priceDelta,
    })),
  }));
}

/** Ganti seluruh grup+pilihan varian sebuah Item — replace-all (hapus semua baris lama, insert baris baru). */
export async function saveProductVariantGroups(
  input: SaveProductVariantGroupsInput,
): Promise<SaveProductVariantGroupsResult> {
  const session = await getMerchantSession();
  if (!session)
    return { ok: false, message: "Sesi berakhir, silakan login kembali." };

  const parsed = saveProductVariantGroupsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }
  const { productId, groups } = parsed.data;

  const product = await db.query.products.findFirst({
    where: and(
      eq(products.id, productId),
      eq(products.merchantId, session.merchantId),
    ),
    columns: { id: true },
  });
  if (!product) {
    return { ok: false, message: "Item tidak ditemukan." };
  }

  await db.transaction(async (tx) => {
    // Cascade di DB otomatis hapus product_variant_options milik grup ini juga.
    await tx
      .delete(productVariantGroups)
      .where(eq(productVariantGroups.productId, productId));

    for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
      const group = groups[groupIndex];
      const [insertedGroup] = await tx
        .insert(productVariantGroups)
        .values({ productId, name: group.name, sortOrder: groupIndex })
        .returning();

      await tx.insert(productVariantOptions).values(
        group.options.map((option, optionIndex) => ({
          groupId: insertedGroup.id,
          name: option.name,
          priceDelta: option.priceDelta,
          sortOrder: optionIndex,
        })),
      );
    }
  });

  return { ok: true, message: "Varian Item disimpan." };
}
