import { z } from "zod";

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format jam harus HH:mm.");

const operatingHoursRowSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    openTime: timeSchema,
    closeTime: timeSchema,
  })
  .refine((row) => row.openTime !== row.closeTime, {
    message: "Jam buka dan tutup tidak boleh sama.",
    path: ["closeTime"],
  });

export const setOperatingHoursSchema = z
  .array(operatingHoursRowSchema)
  .max(7, "Maksimal 7 baris (satu per hari).")
  .refine(
    (rows) => new Set(rows.map((r) => r.dayOfWeek)).size === rows.length,
    { message: "Tiap hari cuma boleh punya satu jadwal." },
  );

export type SetOperatingHoursInput = z.infer<typeof setOperatingHoursSchema>;
