"use client";

import { useEffect, useState } from "react";
import { StoreIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils/cn";
import { toggleMerchantOpen } from "@/server/merchants";

/**
 * Toggle buka/tutup di header — ikon tunggal (bukan pill+label) supaya
 * muat berdampingan dengan ikon header lain di layar sempit. Warna border/bg
 * meniru gaya badge "Tersedia" di ProductListItem (hijau=aktif).
 */
export function OpenToggle({ initialIsOpen }: { initialIsOpen: boolean }) {
  const [isOpen, setIsOpen] = useState(initialIsOpen);
  const [pending, setPending] = useState(false);
  const { showToast } = useToast();

  // Sinkron ulang kalau layout di-refresh server (mis. setelah "Ikuti Jadwal
  // Lagi" di halaman Jadwal) — supaya toggle ini tidak nyangkut di state lama.
  useEffect(() => {
    setIsOpen(initialIsOpen);
  }, [initialIsOpen]);

  async function handleClick() {
    const next = !isOpen;
    setIsOpen(next);
    setPending(true);
    const result = await toggleMerchantOpen(next ? "open" : "closed");
    setPending(false);
    if (!result.ok) {
      setIsOpen(!next);
      return;
    }
    showToast(next ? "Lapak ditandai Buka" : "Lapak ditandai Tutup");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label={
        isOpen
          ? "Lapak sedang Buka — tekan untuk tandai Tutup"
          : "Lapak sedang Tutup — tekan untuk tandai Buka"
      }
      className={cn(
        "flex size-9 items-center justify-center rounded-control border transition-colors disabled:opacity-60",
        isOpen
          ? "border-success/40 bg-success-bg text-success hover:border-success/70 hover:bg-success/15"
          : "border-danger/40 bg-danger-bg text-danger hover:border-danger/70 hover:bg-danger/15",
      )}
    >
      <StoreIcon className="size-4" />
    </button>
  );
}
