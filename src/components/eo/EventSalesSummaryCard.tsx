import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatRupiah } from "@/lib/utils/money";
import type { EventSalesSummary, ProxyStallSales } from "@/types/event";

function MoneyRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-2 text-sm">
      <span className="text-ink-muted">{label}</span>
      <span
        className={
          strong ? "font-bold tabular-nums text-ink" : "tabular-nums text-ink"
        }
      >
        {value}
      </span>
    </div>
  );
}

function ProxySalesRows({ sales }: { sales: ProxyStallSales }) {
  return (
    <div className="flex flex-col gap-1">
      <MoneyRow label="Penjualan" value={formatRupiah(sales.revenue)} />
      <MoneyRow label="Modal belanja" value={formatRupiah(sales.cost)} />
      {sales.refundDue > 0 ? (
        <MoneyRow
          label="Dikembalikan ke Pembeli"
          value={formatRupiah(sales.refundDue)}
        />
      ) : null}
      <MoneyRow
        label={sales.profitIncomplete ? "Keuntungan (perkiraan)" : "Keuntungan"}
        value={formatRupiah(sales.profit)}
        strong
      />
    </div>
  );
}

/**
 * Ringkasan penjualan event (Pesanan yang sudah dibayar). Gerai asli hanya
 * jumlah Pesanan; Gerai Titipan (uang EO sendiri) ditambah rincian uang.
 */
export function EventSalesSummaryCard({
  summary,
}: {
  summary: EventSalesSummary;
}) {
  const proxyCount = summary.stalls.filter((stall) => stall.isProxy).length;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-ink-muted">Total Pesanan dibayar</span>
        <span className="text-2xl font-bold tabular-nums text-ink">
          {summary.totalOrders}
        </span>
      </div>

      {summary.stalls.length > 0 ? (
        <ul className="flex flex-col divide-y divide-line border-t border-line">
          {summary.stalls.map((stall) => (
            <li key={stall.merchantId} className="flex flex-col gap-2 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate font-semibold text-ink">
                    {stall.stallName}
                  </span>
                  {stall.isProxy ? <Badge>Titipan</Badge> : null}
                </span>
                <span className="shrink-0 text-sm tabular-nums text-ink-muted">
                  {stall.orderCount} Pesanan
                </span>
              </div>
              {stall.sales ? <ProxySalesRows sales={stall.sales} /> : null}
            </li>
          ))}
        </ul>
      ) : null}

      {summary.proxyTotals ? (
        <div className="flex flex-col gap-2 rounded-control bg-bg p-3">
          {/* Total gabungan hanya berguna kalau Gerai Titipannya lebih dari satu. */}
          {proxyCount > 1 ? (
            <>
              <p className="text-sm font-semibold text-ink">
                Total semua Gerai Titipan
              </p>
              <ProxySalesRows sales={summary.proxyTotals} />
            </>
          ) : null}
          <p className="text-xs text-ink-muted">
            Modal dihitung dari harga beli Item yang kamu isi. Item yang diganti
            tetap memakai harga beli Item aslinya.
            {summary.proxyTotals.profitIncomplete
              ? " Ada Item tanpa harga beli, jadi keuntungan masih perkiraan."
              : ""}
          </p>
        </div>
      ) : null}
    </Card>
  );
}
