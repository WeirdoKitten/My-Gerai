"use client";

import { useState } from "react";
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
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div>
        <p className="font-medium text-zinc-900 dark:text-zinc-50">
          {merchant.stallName}
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {merchant.ownerName} · {merchant.category} · {merchant.phone}
        </p>
      </div>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      {showRejectForm ? (
        <form onSubmit={handleReject} className="flex flex-col gap-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            minLength={3}
            placeholder="Alasan penolakan..."
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="h-9 flex-1 rounded-md bg-red-600 text-sm font-medium text-white disabled:opacity-60"
            >
              {submitting ? "Memproses..." : "Konfirmasi Tolak"}
            </button>
            <button
              type="button"
              onClick={() => setShowRejectForm(false)}
              className="h-9 rounded-md border border-zinc-300 px-4 text-sm font-medium dark:border-zinc-700"
            >
              Batal
            </button>
          </div>
        </form>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleApprove}
            disabled={submitting}
            className="h-9 flex-1 rounded-md bg-zinc-900 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
          >
            Setujui
          </button>
          <button
            type="button"
            onClick={() => setShowRejectForm(true)}
            disabled={submitting}
            className="h-9 rounded-md border border-red-300 px-4 text-sm font-medium text-red-600 dark:border-red-900 dark:text-red-400"
          >
            Tolak
          </button>
        </div>
      )}
    </div>
  );
}
