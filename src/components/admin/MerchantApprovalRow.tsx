"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { approveMerchant, rejectMerchant } from "@/server/merchants";
import type { AdminMerchantView } from "@/types/admin";

export function MerchantApprovalRow({
  merchant,
  onChanged,
}: {
  merchant: AdminMerchantView;
  onChanged: () => void;
}) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleApprove() {
    setSubmitting(true);
    setError(null);
    const result = await approveMerchant({ merchantId: merchant.id });
    if (!result.ok) {
      setError(result.message ?? "Gagal menyetujui.");
      setSubmitting(false);
      return;
    }
    onChanged();
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await rejectMerchant({ merchantId: merchant.id, reason });
    if (!result.ok) {
      setError(result.message ?? "Gagal menolak.");
      setSubmitting(false);
      return;
    }
    onChanged();
  }

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <p className="font-semibold text-ink">{merchant.stallName}</p>
        <p className="text-sm text-ink-muted">
          {merchant.ownerName} · {merchant.category} · {merchant.phone}
        </p>
      </div>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {showRejectForm ? (
        <form onSubmit={handleReject} className="flex flex-col gap-2">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            minLength={3}
            placeholder="Alasan penolakan (ditampilkan ke Pedagang)..."
          />
          <div className="flex gap-2">
            <Button
              type="submit"
              variant="danger"
              size="sm"
              fullWidth
              loading={submitting}
            >
              {submitting ? "Memproses..." : "Konfirmasi Tolak"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowRejectForm(false)}
            >
              Batal
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            fullWidth
            loading={submitting}
            onClick={handleApprove}
          >
            Setujui
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={submitting}
            onClick={() => setShowRejectForm(true)}
          >
            Tolak
          </Button>
        </div>
      )}
    </Card>
  );
}
