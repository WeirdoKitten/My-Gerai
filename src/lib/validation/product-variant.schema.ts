import { z } from "zod";

export const variantOptionInputSchema = z.object({
  name: z.string().trim().min(1, "Nama pilihan wajib diisi.").max(50),
  priceDelta: z.number().int().min(-100_000_000).max(100_000_000).default(0),
});

export const variantGroupInputSchema = z.object({
  name: z.string().trim().min(1, "Nama grup varian wajib diisi.").max(50),
  options: z
    .array(variantOptionInputSchema)
    .min(1, "Setiap grup varian butuh minimal 1 pilihan.")
    .max(20),
});

export const saveProductVariantGroupsSchema = z.object({
  productId: z.uuid(),
  // 0 grup = valid, artinya Item ini dihapus semua variannya.
  groups: z.array(variantGroupInputSchema).max(10),
});

export type SaveProductVariantGroupsInput = z.infer<
  typeof saveProductVariantGroupsSchema
>;
