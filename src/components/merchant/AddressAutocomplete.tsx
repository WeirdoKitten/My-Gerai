"use client";

import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/Input";
import { SearchIcon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/Spinner";
import type { Coordinates } from "@/lib/utils/geo";
import { type AddressSearchResult, searchAddress } from "@/server/geocoding";

const DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 3;

/**
 * Kotak cari alamat dengan saran otomatis saat mengetik (LocationIQ via
 * `searchAddress`). Request dikirim setelah Pembeli/Pedagang berhenti
 * mengetik `DEBOUNCE_MS` -- hemat kuota harian LocationIQ.
 */
export function AddressAutocomplete({
  near,
  onPick,
}: {
  /** Titik acuan untuk memprioritaskan hasil di sekitarnya (mis. pin sekarang / lokasi Lapak). */
  near?: Coordinates;
  onPick: (result: AddressSearchResult) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AddressSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Nomor urut request -- respons lama yang datang terlambat diabaikan.
  const requestIdRef = useRef(0);
  // Setelah memilih hasil, query diisi label hasil -- jangan picu cari ulang.
  const skipNextSearchRef = useRef(false);
  // `near` berubah tiap pin digeser; cukup dibaca saat request dikirim, bukan pemicu cari ulang.
  const nearRef = useRef(near);
  nearRef.current = near;

  useEffect(() => {
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      requestIdRef.current += 1;
      setResults([]);
      setMessage(null);
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      const found = await searchAddress(trimmed, nearRef.current);
      if (requestId !== requestIdRef.current) return;
      setLoading(false);
      if (found === null) {
        setResults([]);
        setMessage("Pencarian gagal. Coba lagi sebentar lagi.");
        return;
      }
      setResults(found);
      setMessage(
        found.length === 0
          ? "Alamat tidak ditemukan. Coba nama jalan/kelurahan + kota, atau geser peta langsung."
          : null,
      );
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  function pick(result: AddressSearchResult) {
    skipNextSearchRef.current = true;
    requestIdRef.current += 1;
    setQuery(result.label);
    setResults([]);
    setMessage(null);
    setLoading(false);
    onPick(result);
  }

  // Picker sering berada di dalam <form> lain (profil/checkout) -- Enter
  // memilih saran teratas, bukan men-submit form induknya.
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (results[0]) pick(results[0]);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Input
        type="text"
        inputSize="sm"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onClear={() => setQuery("")}
        leftIcon={
          loading ? (
            <Spinner className="size-4" />
          ) : (
            <SearchIcon className="size-4" />
          )
        }
        placeholder="Cari alamat, jalan, atau tempat"
        maxLength={200}
        enterKeyHint="search"
        autoComplete="off"
        aria-label="Cari alamat di peta"
      />
      {results.length > 0 ? (
        <ul className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface">
          {results.map((result) => (
            <li
              key={`${result.latitude},${result.longitude},${result.label}`}
              className="border-b border-line last:border-b-0"
            >
              <button
                type="button"
                onClick={() => pick(result)}
                className="w-full px-3 py-2 text-left text-sm text-ink hover:bg-brand-tint focus-visible:bg-brand-tint focus-visible:outline-none"
              >
                {result.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {message ? (
        <span className="text-xs font-medium text-danger">{message}</span>
      ) : null}
    </div>
  );
}
