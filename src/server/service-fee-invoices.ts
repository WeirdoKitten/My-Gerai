"use server";

import { and, eq, gte, inArray, sql } from "drizzle-orm";
import QRCode from "qrcode";
import { getAdminSession } from "@/lib/auth/admin-session";
import { getMerchantSession } from "@/lib/auth/session";
import { isMerchantOrderingLocked } from "@/lib/billing/service-fee";
import { db } from "@/lib/db/client";
import {
  merchants,
  orders,
  payments,
  serviceFeeInvoices,
} from "@/lib/db/schema";
import { PAID_ORDER_STATUSES } from "@/lib/utils/order-status";
import {
  type MarkServiceFeeInvoicePaidInput,
  markServiceFeeInvoicePaidSchema,
  type VoidServiceFeeInvoiceInput,
  voidServiceFeeInvoiceSchema,
} from "@/lib/validation/service-fee-invoice.schema";
import { getActivePlatformConfig } from "@/server/config";
import type {
  AdminServiceFeeInvoiceView,
  MerchantAccrualView,
  MerchantServiceFeeInvoiceView,
  ServiceFeeInvoiceActionResult,
} from "@/types/service-fee-invoice";

/** `qrString` bisa payload EMV (dirender lokal jadi data URI) ATAU URL gambar — sama dualitas seperti payments.qrString. */
async function toQrImageUrl(qrString: string | null): Promise<string | null> {
  if (!qrString) return null;
  return qrString.startsWith("http")
    ? qrString
    : await QRCode.toDataURL(qrString);
}

/** Tagihan Biaya Layanan milik Lapak sendiri — identitas dari sesi login. */
export async function listMerchantServiceFeeInvoices(): Promise<
  MerchantServiceFeeInvoiceView[]
> {
  const session = await getMerchantSession();
  if (!session) return [];

  const rows = await db.query.serviceFeeInvoices.findMany({
    where: eq(serviceFeeInvoices.merchantId, session.merchantId),
    orderBy: (row, { desc }) => [desc(row.periodStart)],
  });

  return Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      amount: row.amount,
      dueAt: row.dueAt,
      status: row.status,
      paidAt: row.paidAt,
      qrImageUrl:
        row.status === "belum_lunas" ? await toQrImageUrl(row.qrString) : null,
    })),
  );
}

/**
 * Akrual Biaya Layanan yang belum ditagih per Lapak `qris_pribadi` (Admin).
 * "Belum ditagih" = Pesanan lunas sejak `periodEnd` tagihan terakhir Lapak
 * itu (atau sejak Lapak terdaftar kalau belum pernah ditagih) — bukan lewat
 * kolom link (tidak ada `orders.serviceFeeInvoiceId`, akrual selalu dihitung
 * dari rentang waktu, konsisten dengan cron di src/lib/billing/service-fee.ts).
 */
export async function listQrisPribadiMerchantAccruals(): Promise<
  MerchantAccrualView[]
> {
  const session = await getAdminSession();
  if (!session) return [];

  const merchantRows = await db.query.merchants.findMany({
    where: eq(merchants.paymentMode, "qris_pribadi"),
    orderBy: (row, { asc }) => [asc(row.stallName)],
  });
  if (merchantRows.length === 0) return [];

  const { serviceFeeGracePeriodDays } = await getActivePlatformConfig();

  return Promise.all(
    merchantRows.map(async (merchant) => {
      const latestInvoice = await db.query.serviceFeeInvoices.findFirst({
        where: eq(serviceFeeInvoices.merchantId, merchant.id),
        orderBy: (row, { desc }) => [desc(row.periodEnd)],
      });
      const since = latestInvoice?.periodEnd ?? merchant.createdAt;

      const [accrual] = await db
        .select({
          total:
            sql<number>`coalesce(sum(${orders.platformFeeSnapshot}), 0)`.mapWith(
              Number,
            ),
        })
        .from(orders)
        .innerJoin(payments, eq(payments.orderId, orders.id))
        .where(
          and(
            eq(orders.merchantId, merchant.id),
            eq(payments.provider, "qris_pribadi"),
            inArray(orders.status, PAID_ORDER_STATUSES),
            gte(orders.paidAt, since),
          ),
        );

      const locked = await isMerchantOrderingLocked(
        merchant.id,
        serviceFeeGracePeriodDays,
      );

      return {
        merchantId: merchant.id,
        stallName: merchant.stallName,
        unbilledAmount: accrual?.total ?? 0,
        latestInvoiceStatus: latestInvoice?.status ?? null,
        locked,
      };
    }),
  );
}

/** Riwayat tagihan lintas-Lapak (Admin). */
export async function listServiceFeeInvoicesForAdmin(): Promise<
  AdminServiceFeeInvoiceView[]
> {
  const session = await getAdminSession();
  if (!session) return [];

  const rows = await db.query.serviceFeeInvoices.findMany({
    orderBy: (row, { desc }) => [desc(row.periodStart)],
  });
  if (rows.length === 0) return [];

  const merchantIds = [...new Set(rows.map((row) => row.merchantId))];
  const merchantRows = await db.query.merchants.findMany({
    where: inArray(merchants.id, merchantIds),
  });
  const stallNameById = new Map(merchantRows.map((m) => [m.id, m.stallName]));

  return rows.map((row) => ({
    id: row.id,
    merchantId: row.merchantId,
    stallName: stallNameById.get(row.merchantId) ?? "",
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    amount: row.amount,
    dueAt: row.dueAt,
    status: row.status,
    paidAt: row.paidAt,
    voidReason: row.voidReason,
  }));
}

/** Override manual Admin — jaga-jaga webhook Midtrans telat/hilang. */
export async function markServiceFeeInvoicePaidByAdmin(
  input: MarkServiceFeeInvoicePaidInput,
): Promise<ServiceFeeInvoiceActionResult> {
  const parsed = markServiceFeeInvoicePaidSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }
  const session = await getAdminSession();
  if (!session) {
    return {
      ok: false,
      message: "Sesi Admin berakhir, silakan login kembali.",
    };
  }

  const [updated] = await db
    .update(serviceFeeInvoices)
    .set({
      status: "lunas",
      paidAt: new Date(),
      voidReason: parsed.data.note || null,
    })
    .where(
      and(
        eq(serviceFeeInvoices.id, parsed.data.invoiceId),
        eq(serviceFeeInvoices.status, "belum_lunas"),
      ),
    )
    .returning();

  if (!updated) {
    return {
      ok: false,
      message: "Tagihan ini sudah tidak berstatus belum lunas.",
    };
  }
  return { ok: true };
}

/** Koreksi Admin untuk tagihan keliru (mis. sengketa periode). */
export async function voidServiceFeeInvoiceByAdmin(
  input: VoidServiceFeeInvoiceInput,
): Promise<ServiceFeeInvoiceActionResult> {
  const parsed = voidServiceFeeInvoiceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }
  const session = await getAdminSession();
  if (!session) {
    return {
      ok: false,
      message: "Sesi Admin berakhir, silakan login kembali.",
    };
  }

  const [updated] = await db
    .update(serviceFeeInvoices)
    .set({ status: "dibatalkan", voidReason: parsed.data.reason })
    .where(
      and(
        eq(serviceFeeInvoices.id, parsed.data.invoiceId),
        eq(serviceFeeInvoices.status, "belum_lunas"),
      ),
    )
    .returning();

  if (!updated) {
    return {
      ok: false,
      message: "Tagihan ini sudah tidak berstatus belum lunas.",
    };
  }
  return { ok: true };
}
