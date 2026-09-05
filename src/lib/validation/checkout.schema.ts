import { z } from "zod";

/**
 * Sengaja TIDAK ada field harga di sini — total Pesanan selalu dihitung ulang
 * di server dari `products.price`, tidak pernah dipercaya dari klien
 * (lihat docs/ARSITEKTUR-SISTEM.md).
 */
export const checkoutItemSchema = z.object({
  productId: z.uuid(),
  qty: z.number().int().min(1).max(50),
  note: z.string().trim().max(200).optional(),
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
