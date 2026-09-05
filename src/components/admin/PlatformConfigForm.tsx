"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updatePlatformConfig } from "@/server/config";
import type { PlatformConfigView } from "@/types/config";

export function PlatformConfigForm({
  current,
}: {
  current: PlatformConfigView;
}) {
  const router = useRouter();
  const [platformFeeAmount, setPlatformFeeAmount] = useState(
    String(current.platformFeeAmount),
  );
  const [orderExpiryMinutes, setOrderExpiryMinutes] = useState(
    String(current.orderExpiryMinutes),
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const result = await updatePlatformConfig({
      platformFeeAmount: Number(platformFeeAmount),
      orderExpiryMinutes: Number(orderExpiryMinutes),
    });

    if (!result.ok) {
      setError(result.message ?? "Gagal menyimpan.");
      setSubmitting(false);
      return;
    }
    setMessage(result.message ?? "Konfigurasi diperbarui.");
    setSubmitting(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Biaya Layanan (Rp)
        </span>
        <input
          type="number"
          value={platformFeeAmount}
          onChange={(e) => setPlatformFeeAmount(e.target.value)}
          required
          min={0}
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Durasi Kedaluwarsa Pesanan (menit)
        </span>
        <input
          type="number"
          value={orderExpiryMinutes}
          onChange={(e) => setOrderExpiryMinutes(e.target.value)}
          required
          min={1}
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      {message ? (
        <p className="text-sm text-green-600 dark:text-green-400">{message}</p>
      ) : null}
      <button
        type="submit"
        disabled={submitting}
        className="h-11 rounded-md bg-zinc-900 font-medium text-white disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {submitting ? "Menyimpan..." : "Simpan"}
      </button>
    </form>
  );
}
