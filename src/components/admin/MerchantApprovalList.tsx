"use client";

import { useState } from "react";
import { listMerchantsForAdmin } from "@/server/merchants";
import type { AdminMerchantView } from "@/types/admin";
import { MerchantApprovalRow } from "./MerchantApprovalRow";

const STATUS_LABEL: Record<AdminMerchantView["status"], string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
  suspended: "Nonaktif",
};

export function MerchantApprovalList({
  initialMerchants,
}: {
  initialMerchants: AdminMerchantView[];
}) {
  const [merchantList, setMerchantList] = useState(initialMerchants);

  async function refresh() {
    const latest = await listMerchantsForAdmin();
    setMerchantList(latest);
  }

  const pending = merchantList.filter((m) => m.status === "pending");
  const others = merchantList.filter((m) => m.status !== "pending");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Menunggu Persetujuan ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-zinc-500 dark:text-zinc-400">
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
      </div>
      <div>
        <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Semua Pedagang
        </h2>
        <div className="flex flex-col gap-2">
          {others.map((merchant) => (
            <div
              key={merchant.id}
              className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
            >
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">
                  {merchant.stallName}
                </p>
                <p className="text-zinc-500 dark:text-zinc-400">
                  {merchant.phone}
                  {merchant.status === "rejected" && merchant.rejectionReason
                    ? ` — ${merchant.rejectionReason}`
                    : ""}
                </p>
              </div>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {STATUS_LABEL[merchant.status]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
