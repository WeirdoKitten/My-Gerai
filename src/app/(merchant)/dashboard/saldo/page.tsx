import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { WalletIcon } from "@/components/ui/icons";
import { formatDateTime } from "@/lib/utils/datetime";
import { formatRupiah } from "@/lib/utils/money";
import { getMyPayoutSummary } from "@/server/payouts";
import { hasAnyProduct } from "@/server/products";

export default async function MerchantBalancePage() {
  if (!(await hasAnyProduct())) redirect("/dashboard/produk");

  const summary = await getMyPayoutSummary();
  if (!summary) return null;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-ink">Saldo & Pencairan</h2>
      <Card className="flex flex-col gap-1">
        <p className="text-sm text-ink-muted">Saldo belum dicairkan</p>
        <p className="text-3xl font-bold tabular-nums text-ink">
          {formatRupiah(summary.balance)}
        </p>
        <p className="text-xs text-ink-muted">
          Dari Pesanan lunas yang dibayar lewat MyGerai. Pesanan QRIS Pribadi
          tidak dihitung karena uangnya sudah langsung masuk ke kamu. Admin
          mengirim Saldo ke rekening Pencairan di Profil.
        </p>
      </Card>
      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold text-ink">Riwayat Pencairan</h3>
        {summary.payouts.length === 0 ? (
          <EmptyState
            icon={<WalletIcon className="size-10" />}
            title="Belum ada Pencairan"
            description="Setiap kali Admin mencairkan Saldo ke rekening kamu, catatannya muncul di sini."
          />
        ) : (
          <Card className="flex flex-col divide-y divide-line">
            {summary.payouts.map((payout) => (
              <div
                key={payout.id}
                className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="text-sm text-ink">
                    {formatDateTime(payout.settledAt)}
                  </p>
                  {payout.note ? (
                    <p className="break-words text-xs text-ink-muted">
                      {payout.note}
                    </p>
                  ) : null}
                </div>
                <p className="shrink-0 font-semibold tabular-nums text-ink">
                  {formatRupiah(payout.amount)}
                </p>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
