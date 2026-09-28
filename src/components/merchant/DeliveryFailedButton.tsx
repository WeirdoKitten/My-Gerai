"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { PillOption } from "@/components/ui/PillOption";
import { Textarea } from "@/components/ui/Textarea";
import {
  DELIVERY_FAILURE_REASON_LABEL_ID,
  type DeliveryFailureReason,
  minutesUntilDeliveryFailAllowed,
} from "@/lib/utils/order-status";
import { markDeliveryFailed } from "@/server/orders";

const REASONS = Object.keys(
  DELIVERY_FAILURE_REASON_LABEL_ID,
) as DeliveryFailureReason[];

/**
 * Tombol "Gagal Diantar" + Modal alasan. Nonaktif sampai jeda minimal sejak
 * Pesanan mulai diantar lewat (server tetap mengecek ulang). Tanpa refund —
 * lihat ADR 2026-09-28.
 */
export function DeliveryFailedButton({
  orderId,
  deliveryStartedAt,
  onDone,
}: {
  orderId: string;
  deliveryStartedAt: Date | null;
  onDone: () => void;
}) {
  const [waitMinutes, setWaitMinutes] = useState(() =>
    minutesUntilDeliveryFailAllowed(deliveryStartedAt),
  );
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<DeliveryFailureReason | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setWaitMinutes(minutesUntilDeliveryFailAllowed(deliveryStartedAt));
    const timer = window.setInterval(() => {
      setWaitMinutes(minutesUntilDeliveryFailAllowed(deliveryStartedAt));
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [deliveryStartedAt]);

  async function handleSubmit() {
    if (!reason) {
      setError("Pilih alasan dulu.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await markDeliveryFailed(orderId, reason, note);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message ?? "Gagal menyimpan.");
      return;
    }
    setOpen(false);
    onDone();
  }

  return (
    <>
      <Button
        type="button"
        variant="dangerOutline"
        fullWidth
        disabled={waitMinutes > 0}
        onClick={() => setOpen(true)}
      >
        {waitMinutes > 0
          ? `Gagal Diantar (bisa dalam ${waitMinutes} menit)`
          : "Gagal Diantar"}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Tandai Gagal Diantar"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-muted">
            Pesanan akan ditutup sebagai gagal diantar. Tidak ada refund ke
            Pembeli, jadi pastikan kamu sudah mencoba menghubunginya.
          </p>
          <div className="flex flex-wrap gap-2">
            {REASONS.map((value) => (
              <PillOption
                key={value}
                selected={reason === value}
                onClick={() => setReason(value)}
              >
                {DELIVERY_FAILURE_REASON_LABEL_ID[value]}
              </PillOption>
            ))}
          </div>
          <Field
            label="Catatan"
            hint={
              reason === "lainnya" ? "Wajib untuk alasan lainnya." : "Opsional."
            }
          >
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              rows={2}
            />
          </Field>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <Button
            type="button"
            variant="danger"
            fullWidth
            loading={submitting}
            onClick={handleSubmit}
          >
            {submitting ? "Menyimpan..." : "Tandai Gagal Diantar"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
