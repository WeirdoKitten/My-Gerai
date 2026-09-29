import { z } from "zod";

/** Pola `photo_url` Lapak yang sah — hanya file hasil upload kita sendiri (bukan URL sembarang). */
export const MERCHANT_PHOTO_URL_PATTERN =
  /^\/uploads\/merchants\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

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
    photoUrl: z
      .string()
      .regex(MERCHANT_PHOTO_URL_PATTERN, "Foto tidak valid.")
      .nullish(),
    address: z
      .string()
      .trim()
      .max(200, "Alamat maksimal 200 karakter.")
      .optional(),
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

/** Pengaturan Pesanan Antar Lapak sendiri (Fase 11) — lihat updateMerchantDeliverySettings. */
export const updateMerchantDeliverySettingsSchema = z
  .object({
    deliveryEnabled: z.boolean(),
    deliveryFee: z
      .number()
      .int("Ongkir harus bilangan bulat.")
      .min(0, "Ongkir tidak boleh negatif.")
      .max(100_000, "Ongkir maksimal Rp100.000.")
      .nullable(),
    deliveryRadiusKm: z
      .number()
      .min(0.5, "Jangkauan minimal 0,5 km.")
      .max(20, "Jangkauan maksimal 20 km."),
    deliveryEstimate: z
      .string()
      .trim()
      .max(50, "Estimasi maksimal 50 karakter.")
      .optional(),
  })
  .refine((data) => !data.deliveryEnabled || data.deliveryFee !== null, {
    message: "Isi Ongkir dulu sebelum mengaktifkan pesanan antar.",
    path: ["deliveryFee"],
  });

export type UpdateMerchantDeliverySettingsInput = z.infer<
  typeof updateMerchantDeliverySettingsSchema
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
