import { z } from "zod";

export const serviceAreaSchema = z.object({
  name: z.string().trim().min(1, "Nama area wajib diisi.").max(100),
  centerLatitude: z
    .number()
    .min(-90, "Latitude tidak valid.")
    .max(90, "Latitude tidak valid."),
  centerLongitude: z
    .number()
    .min(-180, "Longitude tidak valid.")
    .max(180, "Longitude tidak valid."),
  radiusKm: z
    .number()
    .positive("Radius harus lebih dari 0.")
    .max(500, "Radius maksimal 500 km."),
});

export const saveServiceAreasSchema = z
  .array(serviceAreaSchema)
  .max(50, "Maksimal 50 area.");

export type SaveServiceAreasInput = z.infer<typeof saveServiceAreasSchema>;
