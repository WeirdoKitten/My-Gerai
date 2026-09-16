"use server";

import { and, asc, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { getMerchantSession } from "@/lib/auth/session";
import { isMerchantOrderingLocked } from "@/lib/billing/service-fee";
import { db } from "@/lib/db/client";
import {
  merchants,
  products,
  productVariantGroups,
  productVariantOptions,
} from "@/lib/db/schema";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit/limiter";
import { getMerchantOpenState } from "@/lib/schedule/is-merchant-open";
import { detectImage, saveProductPhoto } from "@/lib/upload/storage";
import {
  type CreateProductInput,
  createProductSchema,
  type UpdateProductInput,
  updateProductSchema,
} from "@/lib/validation/product.schema";
import { getActivePlatformConfig } from "@/server/config";
import type {
  CreateProductResult,
  MerchantPaymentModeView,
  MerchantProductView,
  ProductVariantGroupView,
  SetProductStatusResult,
  StallCatalogResult,
  UpdateProductResult,
  UploadProductPhotoResult,
} from "@/types/product";

const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

/** Batch-fetch grup+opsi varian sejumlah Item sekaligus (2 query, bukan N+1). */
async function fetchVariantGroupsByProductId(
  productIds: string[],
): Promise<Map<string, ProductVariantGroupView[]>> {
  if (productIds.length === 0) return new Map();

  const groups = await db.query.productVariantGroups.findMany({
    where: inArray(productVariantGroups.productId, productIds),
    orderBy: [asc(productVariantGroups.sortOrder)],
  });
  if (groups.length === 0) return new Map();

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

  const groupsByProductId = new Map<string, ProductVariantGroupView[]>();
  for (const group of groups) {
    const list = groupsByProductId.get(group.productId) ?? [];
    list.push({
      id: group.id,
      name: group.name,
      options: (optionsByGroupId.get(group.id) ?? []).map((option) => ({
        id: option.id,
        name: option.name,
        priceDelta: option.priceDelta,
      })),
    });
    groupsByProductId.set(group.productId, list);
  }
  return groupsByProductId;
}

/**
 * Katalog publik sebuah Lapak. `{ok:false}` membedakan slug yang memang
 * tidak ada/belum aktif ("not_found") dari Lapak yang ada tapi sedang
 * dikunci karena tagihan Biaya Layanan menunggak ("locked") — supaya
 * halaman Pembeli bisa tampilkan pesan yang sesuai, bukan 404 generik.
 */
export async function getStallCatalog(
  slug: string,
): Promise<StallCatalogResult> {
  const merchant = await db.query.merchants.findFirst({
    where: and(eq(merchants.slug, slug), eq(merchants.status, "approved")),
  });
  if (!merchant) return { ok: false, reason: "not_found" };

  const { serviceFeeGracePeriodDays } = await getActivePlatformConfig();
  if (await isMerchantOrderingLocked(merchant.id, serviceFeeGracePeriodDays)) {
    return { ok: false, reason: "locked" };
  }

  const [merchantProducts, { isOpen, reopensAt }] = await Promise.all([
    db.query.products.findMany({
      where: and(
        eq(products.merchantId, merchant.id),
        eq(products.status, "available"),
        or(isNull(products.stock), gt(products.stock, 0)),
      ),
      orderBy: [asc(products.name)],
    }),
    getMerchantOpenState(merchant.id),
  ]);
  const variantGroupsByProductId = await fetchVariantGroupsByProductId(
    merchantProducts.map((product) => product.id),
  );

  return {
    ok: true,
    catalog: {
      merchant: {
        slug: merchant.slug,
        stallName: merchant.stallName,
        category: merchant.category,
        photoUrl: merchant.photoUrl,
        isOpen,
        reopensAt: reopensAt ? reopensAt.toISOString() : null,
      },
      products: merchantProducts.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        photoUrl: product.photoUrl,
        variantGroups: variantGroupsByProductId.get(product.id) ?? [],
      })),
    },
  };
}

/**
 * Metode pembayaran sebuah Lapak, tanpa sesi (dibaca Pembeli lewat cart
 * client-side untuk menentukan copy checkout — lihat CartProvider). `null`
 * kalau Lapak tidak ada/belum aktif; pemanggil sebaiknya anggap "gateway"
 * (default paling aman) sampai data ini termuat.
 */
export async function getMerchantPaymentMode(
  slug: string,
): Promise<MerchantPaymentModeView> {
  const merchant = await db.query.merchants.findFirst({
    where: and(eq(merchants.slug, slug), eq(merchants.status, "approved")),
    columns: { paymentMode: true },
  });
  return merchant ? { paymentMode: merchant.paymentMode } : null;
}

/**
 * Status buka/tutup sebuah Lapak, tanpa sesi (dibaca Pembeli lewat cart
 * client-side untuk mengunci Checkout — lihat CartProvider/CheckoutGate).
 * `null` kalau Lapak tidak ada/belum aktif; pemanggil sebaiknya anggap
 * "buka" (paling tidak menghalangi) sampai data ini termuat.
 */
export async function getStallOpenState(
  slug: string,
): Promise<{ isOpen: boolean; reopensAt: string | null } | null> {
  const merchant = await db.query.merchants.findFirst({
    where: and(eq(merchants.slug, slug), eq(merchants.status, "approved")),
    columns: { id: true },
  });
  if (!merchant) return null;

  const { isOpen, reopensAt } = await getMerchantOpenState(merchant.id);
  return { isOpen, reopensAt: reopensAt ? reopensAt.toISOString() : null };
}

/** Daftar Item milik Lapak sendiri (dashboard Pedagang) — identitas dari sesi login. */
export async function listMerchantProducts(): Promise<MerchantProductView[]> {
  const session = await getMerchantSession();
  if (!session) return [];

  const merchantProducts = await db.query.products.findMany({
    where: eq(products.merchantId, session.merchantId),
    orderBy: [asc(products.name)],
  });
  const variantGroupsByProductId = await fetchVariantGroupsByProductId(
    merchantProducts.map((product) => product.id),
  );

  return merchantProducts.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    costPrice: product.costPrice,
    stock: product.stock,
    photoUrl: product.photoUrl,
    status: product.status,
    variantGroupCount: variantGroupsByProductId.get(product.id)?.length ?? 0,
  }));
}

export async function createProduct(
  input: CreateProductInput,
): Promise<CreateProductResult> {
  const session = await getMerchantSession();
  if (!session)
    return { ok: false, message: "Sesi berakhir, silakan login kembali." };

  const parsed = createProductSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }

  const [product] = await db
    .insert(products)
    .values({
      merchantId: session.merchantId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      price: parsed.data.price,
      costPrice: parsed.data.costPrice ?? null,
      stock: parsed.data.stock ?? null,
      photoUrl: parsed.data.photoUrl ?? null,
    })
    .returning();

  return { ok: true, productId: product.id };
}

/**
 * Unggah foto Item. Dipanggil dari `ProductForm` sebelum submit — mengembalikan
 * `photo_url` yang lalu ikut dikirim ke `createProduct`/`updateProduct`.
 * Foto di-resize di klien dulu (`src/lib/upload/resize-image.ts`); di sini
 * tetap validasi tipe (magic bytes) + batas ukuran sebagai backstop.
 */
export async function uploadProductPhoto(
  formData: FormData,
): Promise<UploadProductPhotoResult> {
  const session = await getMerchantSession();
  if (!session)
    return { ok: false, message: "Sesi berakhir, silakan login kembali." };

  if (!checkRateLimit(`upload:${session.merchantId}`, 30, 10 * 60_000)) {
    return { ok: false, message: RATE_LIMIT_MESSAGE };
  }

  const file = formData.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return { ok: false, message: "Tidak ada file foto." };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { ok: false, message: "Ukuran foto maksimal 3 MB." };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = detectImage(bytes);
  if (!ext) {
    return { ok: false, message: "Format foto harus JPG, PNG, atau WebP." };
  }

  const url = await saveProductPhoto(bytes, ext);
  return { ok: true, url };
}

export async function updateProduct(
  input: UpdateProductInput,
): Promise<UpdateProductResult> {
  const session = await getMerchantSession();
  if (!session)
    return { ok: false, message: "Sesi berakhir, silakan login kembali." };

  const parsed = updateProductSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }
  const { productId, name, description, price, costPrice, stock, photoUrl } =
    parsed.data;

  const [updated] = await db
    .update(products)
    .set({
      name,
      description: description ?? null,
      price,
      costPrice: costPrice ?? null,
      stock: stock ?? null,
      photoUrl: photoUrl ?? null,
    })
    .where(
      and(
        eq(products.id, productId),
        eq(products.merchantId, session.merchantId),
      ),
    )
    .returning();

  if (!updated) {
    return { ok: false, message: "Item tidak ditemukan." };
  }
  return { ok: true };
}

export async function setProductStatus(
  productId: string,
  status: "available" | "sold_out",
): Promise<SetProductStatusResult> {
  const session = await getMerchantSession();
  if (!session)
    return { ok: false, message: "Sesi berakhir, silakan login kembali." };

  if (!z.uuid().safeParse(productId).success) {
    return { ok: false, message: "Item tidak ditemukan." };
  }
  if (!z.enum(["available", "sold_out"]).safeParse(status).success) {
    return { ok: false, message: "Status tidak valid." };
  }

  const [updated] = await db
    .update(products)
    .set({ status })
    .where(
      and(
        eq(products.id, productId),
        eq(products.merchantId, session.merchantId),
      ),
    )
    .returning();

  if (!updated) {
    return { ok: false, message: "Item tidak ditemukan." };
  }
  return { ok: true };
}
