import { z } from "zod";
import type { Coordinates } from "@/lib/utils/geo";
import type { PlaceSuggestion } from "@/types/maps";

const PLACES_BASE_URL = "https://places.googleapis.com/v1";
const TIMEOUT_MS = 5000;
/** Radius bias hasil di sekitar titik acuan (meter, maks. yang diizinkan API 50.000). */
const BIAS_RADIUS_M = 30_000;

const autocompleteResponseSchema = z.object({
  suggestions: z
    .array(
      z.object({
        placePrediction: z
          .object({
            placeId: z.string(),
            text: z.object({ text: z.string() }),
            structuredFormat: z
              .object({
                mainText: z.object({ text: z.string() }),
                secondaryText: z.object({ text: z.string() }).optional(),
              })
              .optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});

const placeDetailsResponseSchema = z.object({
  location: z.object({ latitude: z.number(), longitude: z.number() }),
});

/** Google membalas error/response tak terduga — pemanggil wajib fallback ke OSM. */
export class GooglePlacesError extends Error {
  constructor(public readonly status: number | null) {
    super(`Google Places gagal (status ${status ?? "jaringan/parse"})`);
  }
}

export function mapAutocompleteResponse(
  data: z.infer<typeof autocompleteResponseSchema>,
): PlaceSuggestion[] {
  return (data.suggestions ?? []).flatMap((suggestion) => {
    const prediction = suggestion.placePrediction;
    if (!prediction) return [];
    return [
      {
        id: prediction.placeId,
        title:
          prediction.structuredFormat?.mainText.text ?? prediction.text.text,
        subtitle: prediction.structuredFormat?.secondaryText?.text ?? "",
        coords: null,
      },
    ];
  });
}

async function requestGoogleJson(
  url: string,
  apiKey: string,
  init: RequestInit,
) {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        ...init.headers,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new GooglePlacesError(null);
  }
  if (!response.ok) throw new GooglePlacesError(response.status);
  return response.json().catch(() => {
    throw new GooglePlacesError(response.status);
  }) as Promise<unknown>;
}

/**
 * Places API (New) Autocomplete — dibatasi Indonesia, bahasa Indonesia,
 * dibias ke sekitar `near`. `sessionToken` mengelompokkan ketikan dalam satu
 * sesi supaya ditagih sebagai satu sesi saat ditutup `getGooglePlaceLocation`.
 * Throw {@link GooglePlacesError} kalau gagal.
 */
export async function googleAutocomplete(params: {
  apiKey: string;
  query: string;
  sessionToken: string;
  near: Coordinates | null;
}): Promise<PlaceSuggestion[]> {
  const body = {
    input: params.query,
    sessionToken: params.sessionToken,
    includedRegionCodes: ["id"],
    languageCode: "id",
    ...(params.near
      ? {
          locationBias: {
            circle: { center: params.near, radius: BIAS_RADIUS_M },
          },
        }
      : {}),
  };
  const json = await requestGoogleJson(
    `${PLACES_BASE_URL}/places:autocomplete`,
    params.apiKey,
    { method: "POST", body: JSON.stringify(body) },
  );
  const parsed = autocompleteResponseSchema.safeParse(json);
  if (!parsed.success) throw new GooglePlacesError(200);
  return mapAutocompleteResponse(parsed.data);
}

/**
 * Place Details (New) dengan field mask `location` saja (SKU Essentials).
 * Menutup sesi autocomplete. Throw {@link GooglePlacesError} kalau gagal.
 */
export async function getGooglePlaceLocation(params: {
  apiKey: string;
  placeId: string;
  sessionToken: string;
}): Promise<Coordinates> {
  const url = new URL(
    `${PLACES_BASE_URL}/places/${encodeURIComponent(params.placeId)}`,
  );
  url.searchParams.set("sessionToken", params.sessionToken);
  const json = await requestGoogleJson(url.toString(), params.apiKey, {
    method: "GET",
    headers: { "X-Goog-FieldMask": "location" },
  });
  const parsed = placeDetailsResponseSchema.safeParse(json);
  if (!parsed.success) throw new GooglePlacesError(200);
  return parsed.data.location;
}
