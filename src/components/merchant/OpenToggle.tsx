"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import { toggleMerchantOpen } from "@/server/merchants";

/** Kartu status buka/tutup di halaman Pesanan Masuk — kontrol utama harian Pedagang. */
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
    <Card pad="sm" className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-ink">
          Status Lapak:{" "}
          <span className={isOpen ? "text-success" : "text-danger"}>
            {isOpen ? "Buka" : "Tutup"}
          </span>
        </p>
        <p className="text-xs text-ink-muted">
          {isOpen
            ? "Lapak menerima Pesanan baru."
            : "Pembeli tidak bisa checkout sampai Lapak dibuka lagi."}
        </p>
      </div>
      <Toggle
        checked={isOpen}
        onChange={handleChange}
        disabled={pending}
        label="Status buka/tutup Lapak"
      />
    </Card>
  );
}
