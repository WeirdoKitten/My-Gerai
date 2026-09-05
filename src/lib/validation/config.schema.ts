import { z } from "zod";

export const updatePlatformConfigSchema = z.object({
  platformFeeAmount: z
    .number()
    .int()
    .min(0, "Biaya Layanan tidak boleh negatif.")
    .max(100_000, "Biaya Layanan terlalu besar."),
  orderExpiryMinutes: z
    .number()
    .int()
    .min(1, "Durasi kedaluwarsa minimal 1 menit.")
    .max(1440, "Durasi kedaluwarsa maksimal 1440 menit (24 jam)."),
});

export type UpdatePlatformConfigInput = z.infer<
  typeof updatePlatformConfigSchema
>;
