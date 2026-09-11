"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StoreIcon } from "@/components/ui/icons";
import { listMerchantsForAdmin } from "@/server/merchants";
import type { AdminMerchantView } from "@/types/admin";
import { MerchantApprovalRow } from "./MerchantApprovalRow";
import { MerchantPaymentModeControl } from "./MerchantPaymentModeControl";
import { MerchantStatusBadge } from "./MerchantStatusBadge";

export function MerchantApprovalList({
  initialMerchants,
}: {
  initialMerchants: AdminMerchantView[];
}) {
  const [merchantList, setMerchantList] = useState(initialMerchants);

  async function refresh() {
    setMerchantList(await listMerchantsForAdmin());
  }

  const pending = merchantList.filter((m) => m.status === "pending");
  const others = merchantList.filter((m) => m.status !== "pending");

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink">
          Menunggu Persetujuan ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Tidak ada Pedagang yang menunggu.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {pending.map((merchant) => (
              <MerchantApprovalRow
                key={merchant.id}
                merchant={merchant}
                onChanged={refresh}
              />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink">Semua Pedagang</h2>
        {others.length === 0 ? (
          <EmptyState
            icon={<StoreIcon className="size-10" />}
            title="Belum ada Pedagang"
          />
        ) : (
          <div className="flex flex-col gap-2">
            {others.map((merchant) => (
              <Card key={merchant.id} pad="sm" className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">
                      {merchant.stallName}
                    </p>
                    <p className="text-sm text-ink-muted">
                      {merchant.phone}
                      {merchant.status === "rejected" &&
                      merchant.rejectionReason
                        ? ` — ${merchant.rejectionReason}`
                        : ""}
                    </p>
                  </div>
                  <MerchantStatusBadge status={merchant.status} />
                </div>
                {merchant.status === "approved" ? (
                  <MerchantPaymentModeControl
                    merchant={merchant}
                    onChanged={refresh}
                  />
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
