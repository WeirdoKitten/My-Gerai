import { z } from "zod";

export const registerMerchantSchema = z.object({
  stallName: z.string().trim().min(1, "Nama Lapak wajib diisi.").max(100),
  ownerName: z.string().trim().min(1, "Nama Pedagang wajib diisi.").max(100),
  category: z.string().trim().min(1, "Kategori wajib diisi.").max(50),
  phone: z
    .string()
    .trim()
    .regex(/^08\d{8,11}$/, "Nomor HP tidak valid (contoh: 081234567890)."),
  password: z.string().min(8, "Password minimal 8 karakter."),
});

export type RegisterMerchantInput = z.infer<typeof registerMerchantSchema>;

export const loginMerchantSchema = z.object({
  phone: z.string().trim().min(1, "Nomor HP wajib diisi."),
  password: z.string().min(1, "Password wajib diisi."),
});

export type LoginMerchantInput = z.infer<typeof loginMerchantSchema>;

export const updateMerchantProfileSchema = z
  .object({
    stallName: z.string().trim().min(1, "Nama Lapak wajib diisi.").max(100),
    ownerName: z.string().trim().min(1, "Nama Pedagang wajib diisi.").max(100),
    category: z.string().trim().min(1, "Kategori wajib diisi.").max(50),
    address: z.string().trim().max(200, "Alamat maksimal 200 karakter.").optional(),
    payoutAccountInfo: z.string().trim().max(300).optional(),
    latitude: z
      .number()
      .min(-90, "Latitude tidak valid.")
      .max(90, "Latitude tidak valid.")
      .nullable()
      .optional(),
    longitude: z
      .number()
      .min(-180, "Longitude tidak valid.")
      .max(180, "Longitude tidak valid.")
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      const hasLat = data.latitude != null;
      const hasLng = data.longitude != null;
      return hasLat === hasLng;
    },
    {
      message:
        "Titik lokasi GPS harus diisi keduanya (latitude & longitude) atau dikosongkan keduanya.",
      path: ["latitude"],
    },
  );

export type UpdateMerchantProfileInput = z.infer<
  typeof updateMerchantProfileSchema
>;

/** Hanya Admin yang boleh memanggil — lihat setMerchantPaymentMode di server/merchants.ts. */
export const setMerchantPaymentModeSchema = z.object({
  merchantId: z.uuid(),
  paymentMode: z.enum(["gateway", "qris_pribadi"]),
});

export type SetMerchantPaymentModeInput = z.infer<
  typeof setMerchantPaymentModeSchema
>;

export const approveMerchantSchema = z.object({
  merchantId: z.uuid(),
});

export type ApproveMerchantInput = z.infer<typeof approveMerchantSchema>;

export const rejectMerchantSchema = z.object({
  merchantId: z.uuid(),
  reason: z
    .string()
    .trim()
    .min(3, "Alasan wajib diisi (minimal 3 karakter).")
    .max(500),
});

export type RejectMerchantInput = z.infer<typeof rejectMerchantSchema>;
