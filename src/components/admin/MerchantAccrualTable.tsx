import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StoreIcon } from "@/components/ui/icons";
import { formatRupiah } from "@/lib/utils/money";
import type {
  MerchantAccrualView,
  ServiceFeeInvoiceStatus,
} from "@/types/service-fee-invoice";

const STATUS_LABEL: Record<ServiceFeeInvoiceStatus, string> = {
  belum_lunas: "Belum Lunas",
  lunas: "Lunas",
  dibatalkan: "Dibatalkan",
};

const STATUS_TONE: Record<ServiceFeeInvoiceStatus, BadgeTone> = {
  belum_lunas: "warning",
  lunas: "success",
  dibatalkan: "neutral",
};

/** Ringkasan akrual per Lapak `qris_pribadi` — read-only (aksi tandai lunas/batalkan ada di riwayat tagihan). */
export function MerchantAccrualTable({
  accruals,
}: {
  accruals: MerchantAccrualView[];
}) {
  if (accruals.length === 0) {
    return (
      <EmptyState
        icon={<StoreIcon className="size-10" />}
        title="Belum ada Lapak QRIS pribadi"
        description="Muncul di sini kalau ada Lapak yang dipindahkan Admin ke mode QRIS pribadi."
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {accruals.map((row) => (
        <Card
          key={row.merchantId}
          pad="sm"
          className="flex items-center justify-between gap-3"
        >
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{row.stallName}</p>
            <p className="text-sm text-ink-muted">
              Belum ditagih: {formatRupiah(row.unbilledAmount)}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {row.locked ? <Badge tone="danger">Lapak Terkunci</Badge> : null}
            {row.latestInvoiceStatus ? (
              <Badge tone={STATUS_TONE[row.latestInvoiceStatus]}>
                {STATUS_LABEL[row.latestInvoiceStatus]}
              </Badge>
            ) : null}
          </div>
        </Card>
      ))}
    </div>
  );
}
