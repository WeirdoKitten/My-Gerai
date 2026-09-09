import { SalesReportView } from "@/components/merchant/SalesReportView";
import { getMerchantSalesReport } from "@/server/reports";

export default async function MerchantReportPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const { periode } = await searchParams;
  const report = await getMerchantSalesReport(periode ?? "7_hari");
  if (!report) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-ink">Laporan Penjualan</h2>
      <SalesReportView report={report} />
    </div>
  );
}
