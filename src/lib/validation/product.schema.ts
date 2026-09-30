import { z } from "zod";

/** Pola `photo_url` yang sah — hanya file hasil upload kita sendiri (bukan URL sembarang). */
export const PRODUCT_PHOTO_URL_PATTERN =
  /^\/uploads\/products\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

const productFieldsSchema = z.object({
  name: z.string().trim().min(1, "Nama Item wajib diisi.").max(100),
  description: z.string().trim().max(500).optional(),
  price: z.number().int().min(0, "Harga tidak boleh negatif.").max(100_000_000),
  // `null` / undefined = harga modal belum diisi.
  costPrice: z
    .number()
    .int()
    .min(0, "Harga modal tidak boleh negatif.")
    .max(100_000_000)
    .nullish(),
  // `null` / undefined = stok tidak dibatasi.
  stock: z
    .number()
    .int()
    .min(0, "Stok tidak boleh negatif.")
    .max(1_000_000)
    .nullish(),
  photoUrl: z
    .string()
    .regex(PRODUCT_PHOTO_URL_PATTERN, "Foto tidak valid.")
    .nullish(),
  // Pre-order: keduanya diisi (Item pre-order) atau keduanya kosong (Item biasa).
  preOrderMinDays: z
    .number()
    .int()
    .min(1, "Waktu pembuatan minimal 1 hari.")
    .max(30, "Waktu pembuatan maksimal 30 hari.")
    .nullish(),
  preOrderMaxDays: z
    .number()
    .int()
    .max(90, "Batas pesan ke depan maksimal 90 hari.")
    .nullish(),
});

function checkPreOrderFields(
  data: z.infer<typeof productFieldsSchema>,
  ctx: z.RefinementCtx,
) {
  const min = data.preOrderMinDays ?? null;
  const max = data.preOrderMaxDays ?? null;
  if ((min === null) !== (max === null)) {
    ctx.addIssue({
      code: "custom",
      path: ["preOrderMaxDays"],
      message:
        "Isi waktu pembuatan dan batas pesan ke depan untuk Item pre-order.",
    });
  } else if (min !== null && max !== null && max < min) {
    ctx.addIssue({
      code: "custom",
      path: ["preOrderMaxDays"],
      message:
        "Batas pesan ke depan tidak boleh lebih kecil dari waktu pembuatan.",
    });
  }
}

export const createProductSchema =
  productFieldsSchema.superRefine(checkPreOrderFields);

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = productFieldsSchema
  .extend({ productId: z.uuid() })
  .superRefine(checkPreOrderFields);

export type UpdateProductInput = z.infer<typeof updateProductSchema>;
