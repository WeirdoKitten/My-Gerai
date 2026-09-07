import { Card } from "@/components/ui/Card";
import { formatRupiah } from "@/lib/utils/money";
import type { PlatformConfigHistoryEntry } from "@/types/config";

const KEY_LABEL_ID: Record<string, string> = {
  platform_fee_amount: "Biaya Layanan",
  order_expiry_minutes: "Durasi Kedaluwarsa (menit)",
};

function formatHistoryValue(key: string, value: string): string {
  if (key === "platform_fee_amount") return formatRupiah(Number(value));
  return value;
}

export function PlatformConfigHistoryList({
  history,
}: {
  history: PlatformConfigHistoryEntry[];
}) {
  if (history.length === 0) {
    return <p className="text-sm text-ink-muted">Belum ada riwayat.</p>;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {history.map((entry) => (
        <Card
          key={entry.id}
          pad="sm"
          className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-sm"
        >
          <span className="text-ink-muted">
            {KEY_LABEL_ID[entry.key] ?? entry.key}
          </span>
          <span className="font-semibold tabular-nums text-ink">
            {formatHistoryValue(entry.key, entry.value)}
          </span>
          <span className="w-full text-xs text-ink-muted">
            {entry.effectiveFrom.toLocaleString("id-ID")}
          </span>
        </Card>
      ))}
    </div>
  );
}
