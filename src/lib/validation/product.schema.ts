import { z } from "zod";

/** Pola `photo_url` yang sah — hanya file hasil upload kita sendiri (bukan URL sembarang). */
export const PRODUCT_PHOTO_URL_PATTERN =
  /^\/uploads\/products\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

export const createProductSchema = z.object({
  name: z.string().trim().min(1, "Nama Item wajib diisi.").max(100),
  description: z.string().trim().max(500).optional(),
  price: z.number().int().min(0, "Harga tidak boleh negatif.").max(100_000_000),
  photoUrl: z
    .string()
    .regex(PRODUCT_PHOTO_URL_PATTERN, "Foto tidak valid.")
    .nullish(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.extend({
  productId: z.uuid(),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;
