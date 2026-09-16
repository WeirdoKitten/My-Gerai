import { z } from "zod";

/**
 * `groupId` + `optionId` (bukan cuma `optionId`) supaya server bisa validasi
 * "tepat satu opsi per grup" tanpa query tambahan.
 */
export const checkoutVariantSelectionSchema = z.object({
  groupId: z.uuid(),
  optionId: z.uuid(),
});

/**
 * Sengaja TIDAK ada field harga di sini (termasuk harga varian) — total
 * Pesanan selalu dihitung ulang di server dari `products.price` +
 * `product_variant_options.price_delta`, tidak pernah dipercaya dari klien
 * (lihat docs/ARSITEKTUR-SISTEM.md).
 */
export const checkoutItemSchema = z.object({
  productId: z.uuid(),
  qty: z.number().int().min(1).max(50),
  note: z.string().trim().max(200).optional(),
  variantSelections: z
    .array(checkoutVariantSelectionSchema)
    .max(10)
    .optional()
    .default([]),
});

export const createOrderSchema = z.object({
  merchantSlug: z.string().trim().min(1),
  buyerName: z
    .string()
    .trim()
    .min(1, "Nama wajib diisi.")
    .max(100, "Nama maksimal 100 karakter."),
  items: z.array(checkoutItemSchema).min(1, "Keranjang masih kosong."),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
