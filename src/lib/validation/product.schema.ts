import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().trim().min(1, "Nama Item wajib diisi.").max(100),
  description: z.string().trim().max(500).optional(),
  price: z.number().int().min(0, "Harga tidak boleh negatif.").max(100_000_000),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.extend({
  productId: z.uuid(),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;
