"use client";

import { useState } from "react";
import { formatRupiah } from "@/lib/utils/money";
import type { MerchantBalanceView } from "@/types/payout";
import { RecordPayoutForm } from "./RecordPayoutForm";

export function MerchantBalanceTable({
  balances,
  onRecorded,
}: {
  balances: MerchantBalanceView[];
  onRecorded: () => void;
}) {
  const [activeMerchantId, setActiveMerchantId] = useState<string | null>(null);

  if (balances.length === 0) {
    return (
      <p className="text-zinc-500 dark:text-zinc-400">Belum ada Pedagang.</p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {balances.map((row) => (
        <div
          key={row.merchantId}
          className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
        >
          <div className="flex items-center justify-between">
            <p className="font-medium text-zinc-900 dark:text-zinc-50">
              {row.stallName}
            </p>
            <span className="font-semibold text-zinc-900 dark:text-zinc-50">
              {formatRupiah(row.balance)}
            </span>
          </div>
          {activeMerchantId === row.merchantId ? (
            <RecordPayoutForm
              merchantId={row.merchantId}
              balance={row.balance}
              onDone={() => {
                setActiveMerchantId(null);
                onRecorded();
              }}
              onCancel={() => setActiveMerchantId(null)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setActiveMerchantId(row.merchantId)}
              disabled={row.balance <= 0}
              className="mt-2 h-9 rounded-md border border-zinc-300 px-4 text-sm font-medium disabled:opacity-40 dark:border-zinc-700"
            >
              Catat Pencairan
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
