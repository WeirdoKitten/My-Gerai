import { z } from "zod";

/**
 * Penggantian Item di Gerai Titipan (lihat setOrderItemSubstitution).
 * `kind: null` = batalkan penandaan, Item kembali "sesuai pesanan".
 */
export const setOrderItemSubstitutionSchema = z
  .object({
    orderId: z.uuid(),
    orderItemId: z.uuid(),
    kind: z.enum(["diganti", "tidak_tersedia"]).nullable(),
    substituteName: z
      .string()
      .trim()
      .max(100, "Nama barang pengganti maksimal 100 karakter.")
      .optional(),
  })
  .refine((value) => value.kind !== "diganti" || !!value.substituteName, {
    message: "Tulis nama barang penggantinya.",
    path: ["substituteName"],
  });

export type SetOrderItemSubstitutionInput = z.infer<
  typeof setOrderItemSubstitutionSchema
>;
