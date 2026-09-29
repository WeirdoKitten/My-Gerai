import {
  and,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  notLike,
  or,
  sql,
} from "drizzle-orm";
import { db } from "@/lib/db/client";
import { orders, payments, serviceFeeInvoices } from "@/lib/db/schema";
import { getPaymentProviderName } from "@/lib/payment";
import { createServiceFeeInvoiceCharge } from "@/lib/payment/midtrans-provider";
import { PAID_ORDER_STATUSES } from "@/lib/utils/order-status";
import { getActivePlatformConfig } from "@/server/config";
import { SEED_DEMO_INVOICE_PREFIX } from "./constants";
import { listClosedBillingPeriods } from "./period";

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
      // Tagihan contoh dari seeder demo tidak pernah mengunci Lapak.
      or(
        isNull(serviceFeeInvoices.referenceId),
        notLike(serviceFeeInvoices.referenceId, `${SEED_DEMO_INVOICE_PREFIX}%`),
      ),
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
 * Pesanan `qris_pribadi` lunas yang BELUM tercakup tagihan mana pun milik
 * Lapak-nya (status tagihan apa pun, termasuk `dibatalkan` — tagihan yang
 * dibatalkan Admin tidak boleh terbit ulang). Menjaga supaya satu Pesanan
 * tidak pernah ditagih dua kali, walau panjang siklus diubah Admin sehingga
 * batas periode baru tidak sejajar dengan tagihan lama.
 */
const notYetInvoiced = sql`not exists (
  select 1 from ${serviceFeeInvoices}
  where ${serviceFeeInvoices.merchantId} = ${orders.merchantId}
    and ${orders.paidAt} >= ${serviceFeeInvoices.periodStart}
    and ${orders.paidAt} < ${serviceFeeInvoices.periodEnd}
)`;

// Akrual per Lapak: filter dari `payments.provider` milik Pesanan itu sendiri
// (bukan `merchants.paymentMode` saat ini) — supaya Pesanan qris_pribadi lama
// tetap tertagih meski Lapak-nya sudah dipindah Admin balik ke mode gateway.
const billableOrder = and(
  eq(payments.provider, "qris_pribadi"),
  inArray(orders.status, PAID_ORDER_STATUSES),
  notYetInvoiced,
);

/**
 * Job tagihan mingguan Biaya Layanan (Pedagang `qris_pribadi` → Aplikator).
 * BUKAN Server Action — sengaja modul biasa (sama alasan `settle.ts`) supaya
 * tidak jadi RPC publik. Dipanggil dari `POST /api/cron/bill-service-fee`
 * (guard `CRON_SECRET`, lihat src/app/api/cron/bill-service-fee/route.ts).
 *
 * Tagihan susulan (2026-09-30): menagih SEMUA periode tertutup yang masih
 * punya Pesanan belum tertagih, bukan cuma periode terakhir — kalau job telat
 * atau terlewat beberapa minggu, tidak ada Biaya Layanan yang hilang.
 * `dueAt` = saat tagihan terbit (bukan akhir periode), supaya tagihan
 * susulan untuk periode lama tidak langsung lewat masa tenggang dan
 * mengunci Lapak seketika (lihat isMerchantOrderingLocked).
 *
 * Idempoten: `notYetInvoiced` + `UNIQUE(merchantId, periodStart)` mencegah
 * tagihan dobel kalau cron ke-trigger 2x. Charge yang gagal (referenceId
 * masih null) otomatis dicoba lagi di run berikutnya — tidak perlu job retry
 * terpisah.
 */
export async function runWeeklyServiceFeeBilling(): Promise<{
  invoicesCreated: number;
  chargesCreated: number;
}> {
  const now = new Date();
  const { serviceFeeBillingCycleDays } = await getActivePlatformConfig();

  const [oldest] = await db
    .select({
      paidAt: sql<Date | null>`min(${orders.paidAt})`.mapWith((value) =>
        value ? new Date(value) : null,
      ),
    })
    .from(orders)
    .innerJoin(payments, eq(payments.orderId, orders.id))
    .where(billableOrder);

  const periods = oldest?.paidAt
    ? listClosedBillingPeriods(oldest.paidAt, now, serviceFeeBillingCycleDays)
    : [];

  const providerName = getPaymentProviderName();
  let invoicesCreated = 0;
  for (const { periodStart, periodEnd } of periods) {
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
          billableOrder,
          gte(orders.paidAt, periodStart),
          lt(orders.paidAt, periodEnd),
        ),
      )
      .groupBy(orders.merchantId);

    const toInsert = accrualRows
      .filter((row) => row.total > 0)
      .map((row) => ({
        merchantId: row.merchantId,
        periodStart,
        periodEnd,
        amount: row.total,
        dueAt: now,
        status: "belum_lunas" as const,
        provider: providerName,
      }));
    if (toInsert.length === 0) continue;

    const inserted = await db
      .insert(serviceFeeInvoices)
      .values(toInsert)
      .onConflictDoNothing({
        target: [serviceFeeInvoices.merchantId, serviceFeeInvoices.periodStart],
      })
      .returning({ id: serviceFeeInvoices.id });
    invoicesCreated += inserted.length;
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
