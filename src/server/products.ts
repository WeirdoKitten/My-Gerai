"use server";

import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getMerchantSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { merchants, products } from "@/lib/db/schema";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit/limiter";
import { detectImage, saveProductPhoto } from "@/lib/upload/storage";
import {
  type CreateProductInput,
  createProductSchema,
  type UpdateProductInput,
  updateProductSchema,
} from "@/lib/validation/product.schema";
import type {
  CreateProductResult,
  MerchantProductView,
  SetProductStatusResult,
  StallCatalogView,
  UpdateProductResult,
  UploadProductPhotoResult,
} from "@/types/product";

const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

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

/** Daftar Item milik Lapak sendiri (dashboard Pedagang) — identitas dari sesi login. */
export async function listMerchantProducts(): Promise<MerchantProductView[]> {
  const session = await getMerchantSession();
  if (!session) return [];

  const merchantProducts = await db.query.products.findMany({
    where: eq(products.merchantId, session.merchantId),
    orderBy: [asc(products.name)],
  });

  return merchantProducts.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    photoUrl: product.photoUrl,
    status: product.status,
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
  const { productId, name, description, price, photoUrl } = parsed.data;

  const [updated] = await db
    .update(products)
    .set({
      name,
      description: description ?? null,
      price,
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
