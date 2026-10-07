import { withMerchant } from "@/lib/mobile-api/handler";
import { apiError, apiOk } from "@/lib/mobile-api/respond";
import { isReportPeriod, REPORT_PERIODS } from "@/lib/report/period";
import { getMerchantSalesReport } from "@/server/reports";

/** Laporan penjualan + rekomendasi asisten. Query `?period=` salah satu dari `REPORT_PERIODS`. */
export async function GET(request: Request) {
  return withMerchant(request, async () => {
    const period = new URL(request.url).searchParams.get("period");
    if (!isReportPeriod(period)) {
      return apiError(
        "validation",
        `Periode harus salah satu dari: ${REPORT_PERIODS.join(", ")}.`,
      );
    }
    return apiOk(await getMerchantSalesReport(period));
  });
}
