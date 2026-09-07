import { Card } from "@/components/ui/Card";
import { formatRupiah } from "@/lib/utils/money";
import type { AdminPayoutView } from "@/types/payout";

export function PayoutHistoryList({ payouts }: { payouts: AdminPayoutView[] }) {
  if (payouts.length === 0) {
    return (
      <p className="text-sm text-ink-muted">Belum ada Pencairan tercatat.</p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {payouts.map((payout) => (
        <Card
          key={payout.id}
          pad="sm"
          className="flex items-center justify-between gap-3"
        >
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">
              {payout.stallName}
            </p>
            {payout.note ? (
              <p className="truncate text-sm text-ink-muted">{payout.note}</p>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            <p className="font-semibold tabular-nums text-ink">
              {formatRupiah(payout.amount)}
            </p>
            <p className="text-xs text-ink-muted">
              {payout.settledAt ? payout.settledAt.toLocaleString("id-ID") : ""}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
