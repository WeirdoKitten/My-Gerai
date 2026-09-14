import { and, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { orders, payments, serviceFeeInvoices } from "@/lib/db/schema";
import { getPaymentProviderName } from "@/lib/payment";
import { createServiceFeeInvoiceCharge } from "@/lib/payment/midtrans-provider";
import { PAID_ORDER_STATUSES } from "@/lib/utils/order-status";
import { getActivePlatformConfig } from "@/server/config";
import { resolveBillingPeriod } from "./period";

/**
 * Lapak sedang terkunci dari Pesanan baru = ada tagihan `belum_lunas` yang
 * jatuh tempo-nya sudah lewat `gracePeriodDays` hari. Dihitung lazy (tidak
 * ada kolom "locked" tersendiri) — sama filosofi dengan kedaluwarsa Pesanan
 * (lihat ARSITEKTUR-SISTEM.md). Berlaku independen dari `merchants.paymentMode`
 * saat ini — piutang tidak hilang cuma karena Admin pindahkan mode Lapak.
 */
export async function isMerchantOrderingLocked(
  merchantId: string,
  gracePeriodDays: number,
): Promise<boolean> {
  const threshold = new Date(Date.now() - gracePeriodDays * 86_400_000);

  const overdue = await db.query.serviceFeeInvoices.findFirst({
    where: and(
      eq(serviceFeeInvoices.merchantId, merchantId),
      eq(serviceFeeInvoices.status, "belum_lunas"),
      lt(serviceFeeInvoices.dueAt, threshold),
    ),
  });
  return !!overdue;
}

/**
 * Buat charge QRIS untuk tagihan ke Pedagang. Mock deterministik (dev/test,
 * tidak pernah dipakai untuk uang sungguhan) atau Midtrans sungguhan —
 * dipilih dari `invoice.provider` yang sudah dipatok saat baris dibuat.
 */
async function chargeInvoice(invoice: {
  id: string;
  amount: number;
  provider: string;
}): Promise<{ referenceId: string; qrString: string } | null> {
  if (invoice.provider !== "midtrans") {
    return {
      referenceId: `MOCK-svcfee-${invoice.id}`,
      qrString: `MYGERAI-MOCK-INVOICE|invoiceId=${invoice.id}|amount=${invoice.amount}`,
    };
  }
  try {
    return await createServiceFeeInvoiceCharge(invoice.id, invoice.amount);
  } catch (error) {
    console.error("createServiceFeeInvoiceCharge gagal:", error);
    return null;
  }
}

/**
 * Job tagihan mingguan Biaya Layanan (Pedagang `qris_pribadi` → Aplikator).
 * BUKAN Server Action — sengaja modul biasa (sama alasan `settle.ts`) supaya
 * tidak jadi RPC publik. Dipanggil dari `POST /api/cron/bill-service-fee`
 * (guard `CRON_SECRET`, lihat src/app/api/cron/bill-service-fee/route.ts).
 *
 * Idempoten: `UNIQUE(merchantId, periodStart)` mencegah insert dobel kalau
 * cron ke-trigger 2x untuk periode yang sama. Charge yang gagal (referenceId
 * masih null) otomatis dicoba lagi di run berikutnya — tidak perlu job retry
 * terpisah.
 */
export async function runWeeklyServiceFeeBilling(): Promise<{
  invoicesCreated: number;
  chargesCreated: number;
}> {
  const { serviceFeeBillingCycleDays } = await getActivePlatformConfig();
  const { periodStart, periodEnd } = resolveBillingPeriod(
    new Date(),
    serviceFeeBillingCycleDays,
  );

  // Akrual per Lapak: filter dari `payments.provider` milik Pesanan itu
  // sendiri (bukan `merchants.paymentMode` saat ini) — supaya Pesanan
  // qris_pribadi lama tetap tertagih meski Lapak-nya sudah dipindah Admin
  // balik ke mode gateway.
  const accrualRows = await db
    .select({
      merchantId: orders.merchantId,
      total:
        sql<number>`coalesce(sum(${orders.platformFeeSnapshot}), 0)`.mapWith(
          Number,
        ),
    })
    .from(orders)
    .innerJoin(payments, eq(payments.orderId, orders.id))
    .where(
      and(
        eq(payments.provider, "qris_pribadi"),
        inArray(orders.status, PAID_ORDER_STATUSES),
        gte(orders.paidAt, periodStart),
        lt(orders.paidAt, periodEnd),
      ),
    )
    .groupBy(orders.merchantId);

  const providerName = getPaymentProviderName();
  const toInsert = accrualRows
    .filter((row) => row.total > 0)
    .map((row) => ({
      merchantId: row.merchantId,
      periodStart,
      periodEnd,
      amount: row.total,
      dueAt: periodEnd,
      status: "belum_lunas" as const,
      provider: providerName,
    }));

  let invoicesCreated = 0;
  if (toInsert.length > 0) {
    const inserted = await db
      .insert(serviceFeeInvoices)
      .values(toInsert)
      .onConflictDoNothing({
        target: [serviceFeeInvoices.merchantId, serviceFeeInvoices.periodStart],
      })
      .returning({ id: serviceFeeInvoices.id });
    invoicesCreated = inserted.length;
  }

  // Tagihan `belum_lunas` tanpa charge (baru dibuat DI ATAS, atau charge-nya
  // gagal di run sebelumnya) — dicoba (lagi).
  const pending = await db.query.serviceFeeInvoices.findMany({
    where: and(
      eq(serviceFeeInvoices.status, "belum_lunas"),
      isNull(serviceFeeInvoices.referenceId),
    ),
  });

  let chargesCreated = 0;
  for (const invoice of pending) {
    const charge = await chargeInvoice(invoice);
    if (!charge) continue;
    await db
      .update(serviceFeeInvoices)
      .set({ referenceId: charge.referenceId, qrString: charge.qrString })
      .where(eq(serviceFeeInvoices.id, invoice.id));
    chargesCreated++;
  }

  return { invoicesCreated, chargesCreated };
}
