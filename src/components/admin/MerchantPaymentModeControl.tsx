"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { setMerchantPaymentMode } from "@/server/merchants";
import type { AdminMerchantView } from "@/types/admin";

const PAYMENT_MODE_LABEL: Record<AdminMerchantView["paymentMode"], string> = {
  gateway: "Payment Gateway",
  qris_pribadi: "QRIS Pribadi",
};

/**
 * Ganti metode pembayaran Lapak — HANYA Admin (keputusan User). Sebelum
 * mengaktifkan `qris_pribadi`, Admin bisa lihat dulu foto QRIS yang diunggah
 * Pedagang (lihat setMerchantPaymentMode: ditolak server kalau foto belum ada).
 */
export function MerchantPaymentModeControl({
  merchant,
  onChanged,
}: {
  merchant: AdminMerchantView;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const otherMode =
    merchant.paymentMode === "gateway" ? "qris_pribadi" : "gateway";

  async function handleSwitch() {
    setSubmitting(true);
    setError(null);
    const result = await setMerchantPaymentMode({
      merchantId: merchant.id,
      paymentMode: otherMode,
    });
    if (!result.ok) {
      setError(result.message ?? "Gagal mengubah metode pembayaran.");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    setExpanded(false);
    onChanged();
  }

  return (
    <div className="flex flex-col gap-2 border-t border-line pt-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-ink-muted">
          Metode:{" "}
          <span className="font-semibold text-ink">
            {PAYMENT_MODE_LABEL[merchant.paymentMode]}
          </span>
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Tutup" : "Ubah"}
        </Button>
      </div>
      {expanded ? (
        <div className="flex flex-col gap-2">
          {merchant.qrisPhotoUrl ? (
            // biome-ignore lint/performance/noImgElement: pratinjau foto unggahan Pedagang
            <img
              src={merchant.qrisPhotoUrl}
              alt="Foto QRIS pribadi Pedagang"
              className="size-32 rounded-control border border-line object-cover"
            />
          ) : (
            <p className="text-xs text-ink-muted">
              Pedagang belum mengunggah foto QRIS pribadi.
            </p>
          )}
          {error ? <Alert tone="error">{error}</Alert> : null}
          <Button
            type="button"
            size="sm"
            loading={submitting}
            disabled={otherMode === "qris_pribadi" && !merchant.qrisPhotoUrl}
            onClick={handleSwitch}
          >
            {submitting
              ? "Memproses..."
              : `Pindah ke ${PAYMENT_MODE_LABEL[otherMode]}`}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
