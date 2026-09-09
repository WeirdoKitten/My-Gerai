import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { LightbulbIcon } from "@/components/ui/icons";
import {
  INSIGHT_MIN_HISTORY_DAYS,
  INSIGHT_MIN_PAID_ORDERS,
} from "@/lib/report/insights";
import {
  dayKeyLabel,
  REPORT_PERIOD_LABEL,
  REPORT_PERIODS,
} from "@/lib/report/period";
import { cn } from "@/lib/utils/cn";
import { formatRupiah } from "@/lib/utils/money";
import type {
  DailySales,
  Insight,
  MerchantSalesReport,
  ReportPeriod,
  SalesDelta,
  SalesSummary,
  TopItem,
} from "@/types/report";

export function SalesReportView({ report }: { report: MerchantSalesReport }) {
  return (
    <div className="flex flex-col gap-5">
      <PeriodTabs active={report.period} />
      <AssistantSection
        insights={report.insights}
        pending={report.insightsPending}
      />
      <SummaryGrid summary={report.summary} delta={report.delta} />
      {report.daily.length > 1 ? <DailyBars daily={report.daily} /> : null}
      <TopItems items={report.topItems} />
    </div>
  );
}

function PeriodTabs({ active }: { active: ReportPeriod }) {
  return (
    <div className="flex gap-1 rounded-full border border-line bg-surface p-1">
      {REPORT_PERIODS.map((period) => (
        <Link
          key={period}
          href={{ pathname: "/dashboard/laporan", query: { periode: period } }}
          aria-current={period === active ? "page" : undefined}
          className={cn(
            "flex-1 rounded-full px-3 py-1.5 text-center text-sm font-semibold transition-colors",
            period === active
              ? "bg-brand-tint text-brand-strong"
              : "text-ink-muted hover:text-ink",
          )}
        >
          {REPORT_PERIOD_LABEL[period]}
        </Link>
      ))}
    </div>
  );
}

function AssistantSection({
  insights,
  pending,
}: {
  insights: Insight[];
  pending: boolean;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
        <LightbulbIcon className="size-4 text-brand" />
        Rekomendasi Asisten
      </h3>

      {pending ? (
        <Card className="text-sm text-ink-muted">
          Asisten butuh setidaknya {INSIGHT_MIN_HISTORY_DAYS} hari data dan{" "}
          {INSIGHT_MIN_PAID_ORDERS} Pesanan dibayar untuk memberi rekomendasi
          yang bisa dipercaya. Terus layani Pesanan lewat MyGerai — rekomendasi
          muncul otomatis di sini.
        </Card>
      ) : insights.length === 0 ? (
        <Card className="text-sm text-ink-muted">
          Belum ada rekomendasi baru — pola penjualanmu terlihat sehat. Cek lagi
          beberapa hari ke depan.
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {insights.map((insight) => (
            <li key={insight.kind}>
              <Card className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand-strong">
                  <LightbulbIcon className="size-4" />
                </span>
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-semibold text-ink">
                    {insight.title}
                  </p>
                  <p className="text-sm text-ink-muted">{insight.body}</p>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SummaryGrid({
  summary,
  delta,
}: {
  summary: SalesSummary;
  delta: SalesDelta;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Stat
        label="Omzet"
        value={formatRupiah(summary.revenue)}
        deltaPct={delta.revenuePct}
      />
      <Stat
        label="Pesanan"
        value={String(summary.orderCount)}
        deltaPct={delta.orderCountPct}
      />
      <Stat
        label="Rata-rata / Pesanan"
        value={formatRupiah(summary.avgOrderValue)}
      />
      <Stat
        label="Ditagih ke Pembeli"
        value={formatRupiah(summary.buyerTotal)}
        hint={`termasuk Biaya Layanan ${formatRupiah(summary.platformFeeTotal)}`}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  deltaPct,
  hint,
}: {
  label: string;
  value: string;
  deltaPct?: number | null;
  hint?: string;
}) {
  return (
    <Card pad="sm" className="flex flex-col gap-1">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="text-lg font-bold tabular-nums text-ink">{value}</p>
      {deltaPct != null ? <DeltaChip pct={deltaPct} /> : null}
      {hint ? <p className="text-[11px] text-ink-muted">{hint}</p> : null}
    </Card>
  );
}

function DeltaChip({ pct }: { pct: number }) {
  if (pct === 0) {
    return (
      <p className="text-[11px] text-ink-muted">
        Sama seperti periode sebelumnya
      </p>
    );
  }
  const up = pct > 0;
  return (
    <p
      className={cn(
        "text-[11px] font-semibold tabular-nums",
        up ? "text-success" : "text-danger",
      )}
    >
      {up ? "▲" : "▼"} {Math.abs(pct)}% vs periode sebelumnya
    </p>
  );
}

function DailyBars({ daily }: { daily: DailySales[] }) {
  const max = Math.max(1, ...daily.map((day) => day.revenue));

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-ink">Penjualan per hari</h3>
      <Card className="flex flex-col gap-1.5">
        {daily.map((day) => {
          const width =
            day.revenue > 0 ? Math.max(4, (day.revenue / max) * 100) : 0;
          return (
            <div key={day.date} className="flex items-center gap-2 text-xs">
              <span className="w-14 shrink-0 tabular-nums text-ink-muted">
                {dayKeyLabel(day.date)}
              </span>
              <span className="flex h-2.5 flex-1 items-center">
                <span
                  className="block h-full rounded-r-[3px] bg-brand"
                  style={{ width: `${width}%` }}
                />
              </span>
              <span className="w-20 shrink-0 text-right tabular-nums text-ink">
                {day.revenue > 0 ? formatRupiah(day.revenue) : "–"}
              </span>
            </div>
          );
        })}
      </Card>
    </section>
  );
}

function TopItems({ items }: { items: TopItem[] }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-ink">Item terlaris</h3>
      {items.length === 0 ? (
        <Card className="text-sm text-ink-muted">
          Belum ada Item terjual di periode ini.
        </Card>
      ) : (
        <Card className="flex flex-col divide-y divide-line">
          {items.map((item) => (
            <div
              key={item.productId}
              className="flex flex-col gap-1 py-2 first:pt-0 last:pb-0"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium text-ink">
                  {item.name}
                </span>
                <span className="shrink-0 text-sm tabular-nums text-ink">
                  {formatRupiah(item.revenue)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-bg">
                  <span
                    className="block h-full rounded-full bg-brand"
                    style={{
                      width: `${Math.max(2, item.revenueShare * 100)}%`,
                    }}
                  />
                </span>
                <span className="shrink-0 text-[11px] tabular-nums text-ink-muted">
                  {item.qtySold} porsi · {Math.round(item.revenueShare * 100)}%
                </span>
              </div>
            </div>
          ))}
        </Card>
      )}
    </section>
  );
}
