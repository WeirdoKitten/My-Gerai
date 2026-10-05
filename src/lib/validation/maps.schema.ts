import { z } from "zod";

export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

/** Token sesi autocomplete Google = UUID dari `crypto.randomUUID()` di client. */
const sessionTokenSchema = z.uuid();

export const searchPlacesSchema = z.object({
  query: z.string().trim().min(3).max(120),
  provider: z.enum(["google", "osm"]),
  sessionToken: sessionTokenSchema,
  near: coordinatesSchema.nullable().optional(),
});

export const resolvePlaceSchema = z.object({
  // Place ID Google: base64url-ish, panjang bervariasi.
  placeId: z.string().regex(/^[A-Za-z0-9_-]{1,512}$/),
  sessionToken: sessionTokenSchema,
});

export type SearchPlacesInput = z.input<typeof searchPlacesSchema>;
export type ResolvePlaceInput = z.input<typeof resolvePlaceSchema>;
