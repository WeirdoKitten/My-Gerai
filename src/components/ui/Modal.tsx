"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

/**
 * Dialog modal berbasis elemen `<dialog>` bawaan — dapat Esc, focus-trap, &
 * backdrop gratis dari browser. Klik di luar panel menutup.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: <dialog> menangani Esc untuk keyboard; klik backdrop hanya kemudahan mouse
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-card border border-line bg-surface p-0 text-ink shadow-card backdrop:bg-ink/40"
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="font-bold text-ink">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="-mr-1 flex size-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-bg hover:text-ink"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            aria-hidden="true"
            className="size-4"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <div className="max-h-[75vh] overflow-y-auto p-4">{children}</div>
    </dialog>
  );
}
