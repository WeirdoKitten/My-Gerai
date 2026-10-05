"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/Input";
import { MapPinIcon, SearchIcon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/Spinner";
import type { Coordinates } from "@/lib/utils/geo";
import { resolvePlace, searchPlaces } from "@/server/geocoding";
import type { MapProviderName, PlaceSuggestion } from "@/types/maps";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 3;

/** `crypto.randomUUID` hanya ada di secure context — dev lewat IP LAN (http) tetap jalan. */
function newSessionToken(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

/**
 * Kotak cari alamat di atas map picker: ketik → saran (debounce) → pilih →
 * `onPick(koordinat)`. Kalau server melayani dengan OSM padahal mode Google
 * (kuota habis/Google gagal), `onProviderFallback` dipanggil supaya peta ikut
 * pindah ke OSM. Enter tidak pernah men-submit form induk.
 */
export function PlaceSearchBox({
  provider,
  near,
  onPick,
  onProviderFallback,
}: {
  provider: MapProviderName;
  near: Coordinates | null;
  onPick: (coords: Coordinates) => void;
  onProviderFallback: () => void;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);
  // Teks hasil memilih saran — jangan dicari ulang.
  const pickedQueryRef = useRef<string | null>(null);
  const nearRef = useRef(near);
  nearRef.current = near;

  useEffect(() => {
    const trimmed = query.trim();
    if (
      trimmed.length < MIN_QUERY_LENGTH ||
      trimmed === pickedQueryRef.current
    ) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    const requestId = ++requestIdRef.current;
    setSearching(true);
    const timer = setTimeout(async () => {
      sessionTokenRef.current ??= newSessionToken();
      const result = await searchPlaces({
        query: trimmed,
        provider,
        sessionToken: sessionTokenRef.current,
        near: nearRef.current,
      }).catch(() => null);
      if (requestId !== requestIdRef.current) return; // sudah ada ketikan baru
      setSearching(false);
      if (!result) {
        setSuggestions([]);
        return;
      }
      if (result.provider !== provider) onProviderFallback();
      setSuggestions(result.suggestions);
      setOpen(true);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, provider, onProviderFallback]);

  async function pick(suggestion: PlaceSuggestion) {
    setOpen(false);
    setMessage(null);
    pickedQueryRef.current = suggestion.title;
    setQuery(suggestion.title);

    if (suggestion.coords) {
      sessionTokenRef.current = null;
      onPick(suggestion.coords);
      return;
    }

    setResolving(true);
    const result = await resolvePlace({
      placeId: suggestion.id,
      sessionToken: sessionTokenRef.current ?? newSessionToken(),
    }).catch(() => null);
    sessionTokenRef.current = null; // sesi ditutup oleh Place Details
    setResolving(false);

    if (result?.ok) {
      onPick(result.coords);
    } else if (result?.fallbackToOsm) {
      pickedQueryRef.current = null;
      onProviderFallback();
      setMessage(
        "Peta beralih ke mode cadangan. Silakan cari ulang alamatnya.",
      );
    } else {
      setMessage("Gagal mengambil lokasi. Coba lagi atau geser peta manual.");
    }
  }

  const showEmpty =
    open &&
    !searching &&
    suggestions.length === 0 &&
    query.trim().length >= MIN_QUERY_LENGTH;

  return (
    <div className="relative">
      <Input
        type="text"
        value={query}
        onChange={(e) => {
          pickedQueryRef.current = null;
          setMessage(null);
          setQuery(e.target.value);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault(); // jangan submit form profil/checkout
          if (suggestions[0]) void pick(suggestions[0]);
        }}
        onClear={() => {
          pickedQueryRef.current = null;
          setQuery("");
          setSuggestions([]);
        }}
        leftIcon={
          searching || resolving ? (
            <Spinner className="size-4" />
          ) : (
            <SearchIcon className="size-4" />
          )
        }
        placeholder="Cari alamat, contoh: Pasar Baru Bandung"
        aria-label="Cari alamat"
        autoComplete="off"
        enterKeyHint="search"
        maxLength={120}
      />
      {open && suggestions.length > 0 ? (
        <ul className="absolute inset-x-0 top-full z-[1100] mt-1 overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
          {suggestions.map((suggestion) => (
            <li key={suggestion.id}>
              <button
                type="button"
                // mousedown (bukan click) supaya terpilih sebelum input blur menutup daftar.
                onMouseDown={(e) => {
                  e.preventDefault();
                  void pick(suggestion);
                }}
                className="flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left hover:bg-brand-tint focus-visible:bg-brand-tint"
              >
                <MapPinIcon className="mt-0.5 size-4 shrink-0 text-ink-muted" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold text-ink">
                    {suggestion.title}
                  </span>
                  {suggestion.subtitle ? (
                    <span className="truncate text-xs text-ink-muted">
                      {suggestion.subtitle}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
          <li className="border-t border-line px-3.5 py-1.5 text-right text-[11px] text-ink-muted">
            {provider === "google"
              ? "Hasil dari Google"
              : "Hasil dari OpenStreetMap"}
          </li>
        </ul>
      ) : null}
      {showEmpty ? (
        <p className="mt-1 text-xs text-ink-muted">
          Alamat tidak ditemukan. Coba kata lain, atau geser peta manual.
        </p>
      ) : null}
      {message ? (
        <p className="mt-1 text-xs font-medium text-danger">{message}</p>
      ) : null}
    </div>
  );
}
