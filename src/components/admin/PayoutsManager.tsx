"use client";

import { useState } from "react";
import { listMerchantBalances, listPayoutsForAdmin } from "@/server/payouts";
import type { AdminPayoutView, MerchantBalanceView } from "@/types/payout";
import { MerchantBalanceTable } from "./MerchantBalanceTable";
import { PayoutHistoryList } from "./PayoutHistoryList";

export function PayoutsManager({
  initialBalances,
  initialPayouts,
}: {
  initialBalances: MerchantBalanceView[];
  initialPayouts: AdminPayoutView[];
}) {
  const [balances, setBalances] = useState(initialBalances);
  const [payoutHistory, setPayoutHistory] = useState(initialPayouts);

  async function refresh() {
    const [latestBalances, latestPayouts] = await Promise.all([
      listMerchantBalances(),
      listPayoutsForAdmin(),
    ]);
    setBalances(latestBalances);
    setPayoutHistory(latestPayouts);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Saldo Pedagang
        </h2>
        <MerchantBalanceTable balances={balances} onRecorded={refresh} />
      </div>
      <div>
        <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Riwayat Pencairan
        </h2>
        <PayoutHistoryList payouts={payoutHistory} />
      </div>
    </div>
  );
}
