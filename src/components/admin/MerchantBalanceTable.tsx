"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StoreIcon } from "@/components/ui/icons";
import { formatRupiah } from "@/lib/utils/money";
import type { MerchantBalanceView } from "@/types/payout";
import { RecordPayoutForm } from "./RecordPayoutForm";

export function MerchantBalanceTable({
  balances,
  onRecorded,
}: {
  balances: MerchantBalanceView[];
  onRecorded: () => void;
}) {
  const [activeMerchantId, setActiveMerchantId] = useState<string | null>(null);

  if (balances.length === 0) {
    return (
      <EmptyState
        icon={<StoreIcon className="size-10" />}
        title="Belum ada Pedagang"
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {balances.map((row) => (
        <Card key={row.merchantId}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{row.stallName}</p>
              {row.proxyOrganizerName ? (
                <p className="text-xs text-ink-muted">
                  Gerai Titipan · {row.proxyOrganizerName} (dibayar ke QRIS EO)
                </p>
              ) : null}
            </div>
            <span className="shrink-0 font-bold tabular-nums text-ink">
              {formatRupiah(row.balance)}
            </span>
          </div>
          {activeMerchantId === row.merchantId ? (
            <RecordPayoutForm
              merchantId={row.merchantId}
              balance={row.balance}
              onDone={() => {
                setActiveMerchantId(null);
                onRecorded();
              }}
              onCancel={() => setActiveMerchantId(null)}
            />
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-3"
              disabled={row.balance <= 0}
              onClick={() => setActiveMerchantId(row.merchantId)}
            >
              Catat Pencairan
            </Button>
          )}
        </Card>
      ))}
    </div>
  );
}
