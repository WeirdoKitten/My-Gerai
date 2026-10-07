import { z } from "zod";

/** Maks Gerai per event — batas aman form & query (skala event lokal). */
export const MAX_EVENT_MERCHANTS = 100;

export const registerEventOrganizerSchema = z.object({
  organizationName: z
    .string()
    .trim()
    .min(1, "Nama EO/organisasi wajib diisi.")
    .max(100),
  contactName: z
    .string()
    .trim()
    .min(1, "Nama penanggung jawab wajib diisi.")
    .max(100),
  phone: z
    .string()
    .trim()
    .regex(/^08\d{8,11}$/, "Nomor HP tidak valid (contoh: 081234567890)."),
  password: z.string().min(8, "Password minimal 8 karakter."),
});

export type RegisterEventOrganizerInput = z.infer<
  typeof registerEventOrganizerSchema
>;

export const loginEventOrganizerSchema = z.object({
  phone: z.string().trim().min(1, "Nomor HP wajib diisi."),
  password: z.string().min(1, "Password wajib diisi."),
});

export type LoginEventOrganizerInput = z.infer<
  typeof loginEventOrganizerSchema
>;

export const approveEventOrganizerSchema = z.object({
  organizerId: z.uuid(),
});

export const rejectEventOrganizerSchema = z.object({
  organizerId: z.uuid(),
  reason: z.string().trim().min(1, "Alasan penolakan wajib diisi.").max(300),
});

export const eventFieldsSchema = z.object({
  name: z.string().trim().min(1, "Nama event wajib diisi.").max(100),
  description: z
    .string()
    .trim()
    .max(1000, "Deskripsi maksimal 1.000 karakter.")
    .optional(),
  location: z
    .string()
    .trim()
    .max(200, "Lokasi maksimal 200 karakter.")
    .optional(),
});

export type EventFieldsInput = z.infer<typeof eventFieldsSchema>;

export const updateEventSchema = eventFieldsSchema.extend({
  eventId: z.uuid(),
  isActive: z.boolean(),
});

export type UpdateEventInput = z.infer<typeof updateEventSchema>;

export const setEventMerchantsSchema = z.object({
  eventId: z.uuid(),
  merchantIds: z
    .array(z.uuid())
    .max(
      MAX_EVENT_MERCHANTS,
      `Maksimal ${MAX_EVENT_MERCHANTS} Gerai per event.`,
    )
    .refine((ids) => new Set(ids).size === ids.length, "Gerai dobel."),
});

export type SetEventMerchantsInput = z.infer<typeof setEventMerchantsSchema>;
