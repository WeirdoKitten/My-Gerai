"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { formatDateTime } from "@/lib/utils/datetime";
import { formatRupiah } from "@/lib/utils/money";
import {
  markServiceFeeInvoicePaidByAdmin,
  voidServiceFeeInvoiceByAdmin,
} from "@/server/service-fee-invoices";
import type {
  AdminServiceFeeInvoiceView,
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

function InvoiceRowActions({
  invoice,
  onChanged,
}: {
  invoice: AdminServiceFeeInvoiceView;
  onChanged: () => void;
}) {
  const [showVoidForm, setShowVoidForm] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleMarkPaid() {
    setSubmitting(true);
    setError(null);
    const result = await markServiceFeeInvoicePaidByAdmin({
      invoiceId: invoice.id,
    });
    if (!result.ok) {
      setError(result.message ?? "Gagal menandai lunas.");
      setSubmitting(false);
      return;
    }
    onChanged();
  }

  async function handleVoid(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await voidServiceFeeInvoiceByAdmin({
      invoiceId: invoice.id,
      reason,
    });
    if (!result.ok) {
      setError(result.message ?? "Gagal membatalkan tagihan.");
      setSubmitting(false);
      return;
    }
    onChanged();
  }

  if (invoice.status !== "belum_lunas") return null;

  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-line pt-2">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {showVoidForm ? (
        <form onSubmit={handleVoid} className="flex flex-col gap-2">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            minLength={3}
            placeholder="Alasan pembatalan (mis. sengketa periode)..."
          />
          <div className="flex gap-2">
            <Button
              type="submit"
              variant="danger"
              size="sm"
              fullWidth
              loading={submitting}
            >
              {submitting ? "Memproses..." : "Konfirmasi Batalkan"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowVoidForm(false)}
            >
              Batal
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            fullWidth
            loading={submitting}
            onClick={handleMarkPaid}
          >
            Tandai Lunas
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={submitting}
            onClick={() => setShowVoidForm(true)}
          >
            Batalkan
          </Button>
        </div>
      )}
    </div>
  );
}

/** Override manual jaga-jaga webhook Midtrans telat/hilang (Tandai Lunas), atau koreksi tagihan keliru (Batalkan). */
export function ServiceFeeInvoiceHistoryList({
  invoices,
  onChanged,
}: {
  invoices: AdminServiceFeeInvoiceView[];
  onChanged: () => void;
}) {
  if (invoices.length === 0) {
    return (
      <p className="text-sm text-ink-muted">Belum ada tagihan tercatat.</p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {invoices.map((invoice) => (
        <Card key={invoice.id} pad="sm" className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">
                {invoice.stallName}
              </p>
              <p className="text-sm text-ink-muted">
                {formatDateTime(invoice.periodStart)} –{" "}
                {formatDateTime(invoice.periodEnd)}
              </p>
              {invoice.voidReason ? (
                <p className="text-xs text-ink-muted">
                  Catatan: {invoice.voidReason}
                </p>
              ) : null}
            </div>
            <div className="shrink-0 text-right">
              <p className="font-semibold tabular-nums text-ink">
                {formatRupiah(invoice.amount)}
              </p>
              <Badge tone={STATUS_TONE[invoice.status]}>
                {STATUS_LABEL[invoice.status]}
              </Badge>
            </div>
          </div>
          <InvoiceRowActions invoice={invoice} onChanged={onChanged} />
        </Card>
      ))}
    </div>
  );
}
