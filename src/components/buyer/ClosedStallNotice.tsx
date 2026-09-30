"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatDateTime } from "@/lib/utils/datetime";

/** Pop up saat halaman menu Lapak tutup pertama kali diakses — muncul lagi tiap kunjungan. */
export function ClosedStallNotice({
  reopensAt,
  hasPreOrderItems = false,
}: {
  reopensAt: string | null;
  /** Lapak punya Item pre-order -- Item itu tetap bisa dipesan walau tutup. */
  hasPreOrderItems?: boolean;
}) {
  const [open, setOpen] = useState(true);

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="Lapak Sedang Tutup"
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-muted">
          {reopensAt
            ? `Buka lagi ${formatDateTime(new Date(reopensAt))}. `
            : ""}
          {hasPreOrderItems
            ? "Item pre-order tetap bisa dipesan sekarang. Item lainnya bisa dilihat, tapi belum bisa dipesan."
            : "Kamu masih bisa lihat menu, tapi belum bisa checkout sekarang."}
        </p>
        <Button type="button" fullWidth onClick={() => setOpen(false)}>
          Mengerti
        </Button>
      </div>
    </Modal>
  );
}
