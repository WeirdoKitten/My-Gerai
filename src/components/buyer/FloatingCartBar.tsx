"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ArrowRightIcon, CartIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";
import { useCart } from "@/lib/cart/cart-context";
import { formatDateTime } from "@/lib/utils/datetime";
import { formatRupiah } from "@/lib/utils/money";

export function FloatingCartBar() {
  const { itemCount, subtotalDisplay, isOpen, reopensAt } = useCart();
  const [showClosedNotice, setShowClosedNotice] = useState(false);

  if (itemCount === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 px-4 pb-4">
      <Link
        href="/checkout"
        onClick={(e) => {
          if (isOpen) return;
          e.preventDefault();
          setShowClosedNotice(true);
        }}
        className="mx-auto flex h-14 max-w-md items-center justify-between gap-3 rounded-full bg-brand-strong px-5 text-white shadow-card transition-colors hover:bg-brand-strong-hover"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <CartIcon className="size-5" />
          {itemCount} item
        </span>
        <span className="flex items-center gap-2 font-bold tabular-nums">
          {formatRupiah(subtotalDisplay)}
          <ArrowRightIcon className="size-4" />
        </span>
      </Link>

      <Modal
        open={showClosedNotice}
        onClose={() => setShowClosedNotice(false)}
        title="Lapak Sedang Tutup"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-muted">
            Kamu belum bisa checkout sekarang
            {reopensAt
              ? ` — Lapak buka lagi ${formatDateTime(new Date(reopensAt))}`
              : ""}
            . Coba lagi nanti.
          </p>
          <Button
            type="button"
            fullWidth
            onClick={() => setShowClosedNotice(false)}
          >
            Mengerti
          </Button>
        </div>
      </Modal>
    </div>
  );
}
