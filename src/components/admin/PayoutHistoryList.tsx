import { formatRupiah } from "@/lib/utils/money";
import type { AdminPayoutView } from "@/types/payout";

export function PayoutHistoryList({ payouts }: { payouts: AdminPayoutView[] }) {
  if (payouts.length === 0) {
    return (
      <p className="text-zinc-500 dark:text-zinc-400">
        Belum ada Pencairan tercatat.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {payouts.map((payout) => (
        <div
          key={payout.id}
          className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
        >
          <div>
            <p className="font-medium text-zinc-900 dark:text-zinc-50">
              {payout.stallName}
            </p>
            {payout.note ? (
              <p className="text-zinc-500 dark:text-zinc-400">{payout.note}</p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="font-semibold text-zinc-900 dark:text-zinc-50">
              {formatRupiah(payout.amount)}
            </p>
            <p className="text-xs text-zinc-400">
              {payout.settledAt ? payout.settledAt.toLocaleString("id-ID") : ""}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
