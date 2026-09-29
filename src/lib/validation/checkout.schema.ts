import { z } from "zod";
import { ORDER_CODE_PATTERN } from "@/lib/utils/order-code";
import { normalizeIndonesianPhone } from "@/lib/utils/phone";

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

const baseOrderSchema = z.object({
  merchantSlug: z.string().trim().min(1),
  buyerName: z
    .string()
    .trim()
    .min(1, "Nama wajib diisi.")
    .max(100, "Nama maksimal 100 karakter."),
  items: z.array(checkoutItemSchema).min(1, "Keranjang masih kosong."),
});

/** Nomor HP Indonesia, dinormalisasi ke `62...` (lihat normalizeIndonesianPhone). */
export const buyerPhoneSchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const normalized = normalizeIndonesianPhone(value);
    if (!normalized) {
      ctx.addIssue({
        code: "custom",
        message: "Nomor HP tidak valid (contoh: 0812 3456 7890).",
      });
      return z.NEVER;
    }
    return normalized;
  });

/**
 * Mode Diantar (Fase 11) wajib HP + alamat + pin. Sengaja TIDAK ada field
 * Ongkir/jarak — keduanya selalu dihitung ulang di server dari pengaturan
 * Lapak & koordinat, tidak pernah dipercaya dari klien.
 */
export const createOrderSchema = z.discriminatedUnion("fulfillmentMethod", [
  baseOrderSchema.extend({ fulfillmentMethod: z.literal("ambil_sendiri") }),
  baseOrderSchema.extend({
    fulfillmentMethod: z.literal("antar"),
    buyerPhone: buyerPhoneSchema,
    deliveryAddress: z
      .string()
      .trim()
      .min(5, "Alamat pengantaran wajib diisi.")
      .max(300, "Alamat maksimal 300 karakter."),
    deliveryLandmark: z
      .string()
      .trim()
      .max(150, "Patokan maksimal 150 karakter.")
      .optional(),
    deliveryLatitude: z.number().min(-90).max(90),
    deliveryLongitude: z.number().min(-180).max(180),
  }),
]);

export type CreateOrderInput = z.input<typeof createOrderSchema>;

/** Lacak Pesanan: kode format baru saja, spasi diabaikan & huruf kecil dinormalisasi. */
export const trackOrderSchema = z.object({
  orderCode: z
    .string()
    .max(20)
    .transform((value) => value.replace(/\s/g, "").toUpperCase())
    .pipe(z.string().regex(ORDER_CODE_PATTERN)),
});
