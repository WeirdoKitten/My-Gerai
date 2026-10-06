"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PlusIcon, SearchIcon, XIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/Toast";
import { MAX_EVENT_MERCHANTS } from "@/lib/validation/event.schema";
import { setEventMerchants } from "@/server/events";
import type { EventMerchantOption } from "@/types/event";

const SEARCH_RESULT_LIMIT = 8;

/**
 * Pilih Gerai untuk event: cari dari semua Gerai aktif, tambah, hapus, atur
 * urutan. Urutan di sini = urutan tampil ke peserta. Disimpan sekaligus
 * (replace-all) lewat tombol "Simpan Gerai".
 */
export function EventMerchantPicker({
  eventId,
  initialSelected,
  options,
}: {
  eventId: string;
  initialSelected: EventMerchantOption[];
  options: EventMerchantOption[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [selected, setSelected] = useState(initialSelected);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedIds = useMemo(
    () => new Set(selected.map((merchant) => merchant.id)),
    [selected],
  );
  const normalizedQuery = query.trim().toLowerCase();
  const results = normalizedQuery
    ? options
        .filter(
          (option) =>
            !selectedIds.has(option.id) &&
            (option.stallName.toLowerCase().includes(normalizedQuery) ||
              option.category.toLowerCase().includes(normalizedQuery)),
        )
        .slice(0, SEARCH_RESULT_LIMIT)
    : [];
  const dirty =
    selected.length !== initialSelected.length ||
    selected.some((merchant, i) => merchant.id !== initialSelected[i]?.id);

  function add(option: EventMerchantOption) {
    if (selected.length >= MAX_EVENT_MERCHANTS) return;
    setSelected((list) => [...list, option]);
    setQuery("");
  }

  function remove(id: string) {
    setSelected((list) => list.filter((merchant) => merchant.id !== id));
  }

  function move(index: number, delta: -1 | 1) {
    setSelected((list) => {
      const target = index + delta;
      if (target < 0 || target >= list.length) return list;
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await setEventMerchants({
      eventId,
      merchantIds: selected.map((merchant) => merchant.id),
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.message ?? "Gagal menyimpan Gerai.");
      return;
    }
    showToast("Daftar Gerai disimpan");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama Gerai untuk ditambahkan"
          aria-label="Cari Gerai"
          className="pl-9"
        />
      </div>
      {normalizedQuery ? (
        results.length > 0 ? (
          <Card pad="none">
            <ul className="divide-y divide-line">
              {results.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => add(option)}
                    className="flex w-full items-center justify-between gap-3 p-3 text-left transition-colors hover:bg-bg"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink">
                        {option.stallName}
                      </span>
                      <span className="block text-xs text-ink-muted">
                        {option.category}
                      </span>
                    </span>
                    <PlusIcon className="size-5 shrink-0 text-brand-strong" />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <p className="text-sm text-ink-muted">Gerai tidak ditemukan.</p>
        )
      ) : null}

      {selected.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Belum ada Gerai. Cari lalu ketuk Gerai untuk menambahkannya.
        </p>
      ) : (
        <Card pad="none">
          <ol className="divide-y divide-line">
            {selected.map((merchant, index) => (
              <li
                key={merchant.id}
                className="flex items-center justify-between gap-2 p-3"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink">
                    {index + 1}. {merchant.stallName}
                  </span>
                  <span className="block text-xs text-ink-muted">
                    {merchant.category}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`Naikkan ${merchant.stallName}`}
                    className="flex size-8 items-center justify-center rounded-lg text-ink-muted hover:bg-bg disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === selected.length - 1}
                    aria-label={`Turunkan ${merchant.stallName}`}
                    className="flex size-8 items-center justify-center rounded-lg text-ink-muted hover:bg-bg disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(merchant.id)}
                    aria-label={`Hapus ${merchant.stallName}`}
                    className="flex size-8 items-center justify-center rounded-lg text-danger hover:bg-danger-bg"
                  >
                    <XIcon className="size-4" />
                  </button>
                </span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {error ? <Alert tone="error">{error}</Alert> : null}
      <Button
        type="button"
        onClick={handleSave}
        loading={saving}
        disabled={!dirty}
        fullWidth
      >
        {saving ? "Menyimpan..." : "Simpan Gerai"}
      </Button>
    </div>
  );
}
