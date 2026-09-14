"use client";

import { useEffect, useState } from "react";
import { Toggle } from "@/components/ui/Toggle";
import { cn } from "@/lib/utils/cn";
import { toggleMerchantOpen } from "@/server/merchants";

/** Baris status buka/tutup di halaman Pesanan Masuk — kontrol utama harian Pedagang. */
export function OpenToggle({ initialIsOpen }: { initialIsOpen: boolean }) {
  const [isOpen, setIsOpen] = useState(initialIsOpen);
  const [pending, setPending] = useState(false);

  // Sinkron ulang kalau halaman di-refresh server (mis. setelah "Ikuti Jadwal
  // Lagi" di halaman Jadwal) — supaya toggle ini tidak nyangkut di state lama.
  useEffect(() => {
    setIsOpen(initialIsOpen);
  }, [initialIsOpen]);

  async function handleChange(next: boolean) {
    setIsOpen(next);
    setPending(true);
    const result = await toggleMerchantOpen(next ? "open" : "closed");
    setPending(false);
    if (!result.ok) {
      setIsOpen(!next);
    }
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-card border p-3.5 shadow-card transition-colors",
        isOpen
          ? "border-success/30 bg-success/10"
          : "border-danger/30 bg-danger/10",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "size-3 shrink-0 rounded-full",
            isOpen ? "bg-success" : "bg-danger",
          )}
        />
        <div>
          <p className="text-sm font-semibold text-ink">
            Status Lapak:{" "}
            <span className={isOpen ? "text-success" : "text-danger"}>
              {isOpen ? "Buka" : "Tutup"}
            </span>
          </p>
          <p className="text-xs text-ink-muted">
            {isOpen
              ? "Siap menerima pesanan baru"
              : "Tidak bisa menerima pesanan baru"}
          </p>
        </div>
      </div>
      <Toggle
        checked={isOpen}
        onChange={handleChange}
        disabled={pending}
        label="Status buka/tutup Lapak"
      />
    </div>
  );
}
