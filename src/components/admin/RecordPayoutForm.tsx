"use client";

import { useState } from "react";
import { recordPayout } from "@/server/payouts";

export function RecordPayoutForm({
  merchantId,
  balance,
  onDone,
  onCancel,
}: {
  merchantId: string;
  balance: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState(String(balance));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await recordPayout({
      merchantId,
      amount: Number(amount),
      note: note || undefined,
    });

    if (!result.ok) {
      setError(result.message ?? "Gagal mencatat Pencairan.");
      setSubmitting(false);
      return;
    }
    onDone();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 flex flex-col gap-2 border-t border-zinc-200 pt-2 dark:border-zinc-800"
    >
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Nominal (Rp)
        </span>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          min={1}
          max={balance}
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Catatan (opsional)
        </span>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="h-9 flex-1 rounded-md bg-zinc-900 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {submitting ? "Menyimpan..." : "Konfirmasi Pencairan"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-9 rounded-md border border-zinc-300 px-4 text-sm font-medium dark:border-zinc-700"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
