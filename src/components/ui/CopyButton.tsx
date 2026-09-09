"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";

/**
 * Tombol ikon untuk menyalin `value` ke clipboard. Umpan balik inline: ikon
 * berubah jadi centang ±2 detik. Tidak bergantung pada `ToastProvider` supaya
 * bisa dipakai di konteks mana pun.
 */
export function CopyButton({
  value,
  label = "link",
  className,
}: {
  value: string;
  /** Dipakai di `aria-label`/`title` — mis. "link menu". */
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? `${label} tersalin` : `Salin ${label}`}
      title={copied ? "Tersalin" : `Salin ${label}`}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-control border border-line bg-surface text-ink-muted transition-colors hover:bg-bg hover:text-ink",
        copied && "border-success/50 text-success",
        className,
      )}
    >
      {copied ? (
        <CheckIcon className="size-4" />
      ) : (
        <CopyIcon className="size-4" />
      )}
    </button>
  );
}
