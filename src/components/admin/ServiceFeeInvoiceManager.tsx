"use client";

import { useState } from "react";
import {
  listQrisPribadiMerchantAccruals,
  listServiceFeeInvoicesForAdmin,
} from "@/server/service-fee-invoices";
import type {
  AdminServiceFeeInvoiceView,
  MerchantAccrualView,
} from "@/types/service-fee-invoice";
import { MerchantAccrualTable } from "./MerchantAccrualTable";
import { ServiceFeeInvoiceHistoryList } from "./ServiceFeeInvoiceHistoryList";

export function ServiceFeeInvoiceManager({
  initialAccruals,
  initialInvoices,
}: {
  initialAccruals: MerchantAccrualView[];
  initialInvoices: AdminServiceFeeInvoiceView[];
}) {
  const [accruals, setAccruals] = useState(initialAccruals);
  const [invoices, setInvoices] = useState(initialInvoices);

  async function refresh() {
    const [latestAccruals, latestInvoices] = await Promise.all([
      listQrisPribadiMerchantAccruals(),
      listServiceFeeInvoicesForAdmin(),
    ]);
    setAccruals(latestAccruals);
    setInvoices(latestInvoices);
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink">Lapak QRIS Pribadi</h2>
        <MerchantAccrualTable accruals={accruals} />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink">Riwayat Tagihan</h2>
        <ServiceFeeInvoiceHistoryList invoices={invoices} onChanged={refresh} />
      </section>
    </div>
  );
}
