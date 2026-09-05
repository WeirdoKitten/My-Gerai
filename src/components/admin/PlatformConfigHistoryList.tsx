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
    return (
      <p className="text-zinc-500 dark:text-zinc-400">Belum ada riwayat.</p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {history.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
        >
          <span className="text-zinc-500 dark:text-zinc-400">
            {KEY_LABEL_ID[entry.key] ?? entry.key}
          </span>
          <span className="font-medium text-zinc-900 dark:text-zinc-50">
            {formatHistoryValue(entry.key, entry.value)}
          </span>
          <span className="text-xs text-zinc-400">
            {entry.effectiveFrom.toLocaleString("id-ID")}
          </span>
        </div>
      ))}
    </div>
  );
}
