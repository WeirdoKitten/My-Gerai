"use client";

import { useEffect, useState } from "react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReceiptIcon } from "@/components/ui/icons";
import { formatDateTime } from "@/lib/utils/datetime";
import { formatRupiah } from "@/lib/utils/money";
import { listMerchantServiceFeeInvoices } from "@/server/service-fee-invoices";
import type {
  MerchantServiceFeeInvoiceView,
  ServiceFeeInvoiceStatus,
} from "@/types/service-fee-invoice";

const POLL_INTERVAL_MS = 4000;

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

export function ServiceFeeInvoiceList({
  initialInvoices,
}: {
  initialInvoices: MerchantServiceFeeInvoiceView[];
}) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const hasUnpaid = invoices.some(
    (invoice) => invoice.status === "belum_lunas",
  );

  // Polling ringan selagi ada tagihan belum lunas — begitu webhook Midtrans
  // masuk (atau Admin override manual), status berubah otomatis tanpa
  // refresh manual (pola sama seperti OrderStatusView).
  useEffect(() => {
    if (!hasUnpaid) return;
    const interval = window.setInterval(async () => {
      setInvoices(await listMerchantServiceFeeInvoices());
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [hasUnpaid]);

  if (invoices.length === 0) {
    return (
      <EmptyState
        icon={<ReceiptIcon className="size-10" />}
        title="Belum ada tagihan"
        description="Tagihan Biaya Layanan mingguan muncul di sini kalau Lapak memakai QRIS pribadi."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {invoices.map((invoice) => (
        <Card key={invoice.id} className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-ink-muted">
              {formatDateTime(invoice.periodStart)} –{" "}
              {formatDateTime(invoice.periodEnd)}
            </p>
            <Badge tone={STATUS_TONE[invoice.status]}>
              {STATUS_LABEL[invoice.status]}
            </Badge>
          </div>
          <p className="text-xl font-bold tabular-nums text-ink">
            {formatRupiah(invoice.amount)}
          </p>
          {invoice.status === "belum_lunas" ? (
            <p className="text-xs text-ink-muted">
              Jatuh tempo {formatDateTime(invoice.dueAt)}
            </p>
          ) : null}
          {invoice.status === "belum_lunas" && invoice.qrImageUrl ? (
            <div className="flex flex-col items-center gap-2 border-t border-line pt-3">
              <p className="text-center text-sm text-ink-muted">
                Pindai untuk membayar tagihan ke Aplikator
              </p>
              {/* biome-ignore lint/performance/noImgElement: data URI/URL gambar gateway, next/image tidak berlaku */}
              <img
                src={invoice.qrImageUrl}
                alt="QR pembayaran tagihan"
                className="size-40 rounded-control"
              />
            </div>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
