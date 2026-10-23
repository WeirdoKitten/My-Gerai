"use server";

import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  type SQL,
  sql,
} from "drizzle-orm";
import QRCode from "qrcode";
import { getAdminSession } from "@/lib/auth/admin-session";
import { getEventOrganizerSession } from "@/lib/auth/eo-session";
import { getMerchantSession } from "@/lib/auth/session";
import {
  isMerchantOrderingLocked,
  isOrganizerBillingLocked,
} from "@/lib/billing/service-fee";
import { db } from "@/lib/db/client";
import {
  eventOrganizers,
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

type InvoiceRow = typeof serviceFeeInvoices.$inferSelect;

/** Baris tagihan -> tampilan untuk pemiliknya (Pedagang atau EO). */
async function toOwnerInvoiceView(
  row: InvoiceRow,
): Promise<MerchantServiceFeeInvoiceView> {
  return {
    id: row.id,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    amount: row.amount,
    dueAt: row.dueAt,
    status: row.status,
    paidAt: row.paidAt,
    qrImageUrl:
      row.status === "belum_lunas" ? await toQrImageUrl(row.qrString) : null,
    // Isi QR mentah supaya aplikasi bisa menggambar QR tajam di HP. URL gambar
    // (bukan payload QRIS) tidak dikirim di sini; klien memakai qrImageUrl.
    qrString:
      row.status === "belum_lunas" &&
      row.qrString &&
      !row.qrString.startsWith("http")
        ? row.qrString
        : null,
  };
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
  return Promise.all(rows.map(toOwnerInvoiceView));
}

/**
 * Tagihan Biaya Layanan EO sendiri (gabungan semua Gerai Titipannya,
 * 2026-10-23) + status kunci — identitas dari sesi EO.
 */
export async function listMyEventOrganizerServiceFeeInvoices(): Promise<{
  invoices: MerchantServiceFeeInvoiceView[];
  locked: boolean;
} | null> {
  const session = await getEventOrganizerSession();
  if (!session) return null;

  const [rows, { serviceFeeGracePeriodDays }] = await Promise.all([
    db.query.serviceFeeInvoices.findMany({
      where: eq(serviceFeeInvoices.organizerId, session.organizerId),
      orderBy: (row, { desc }) => [desc(row.periodStart)],
    }),
    getActivePlatformConfig(),
  ]);
  return {
    invoices: await Promise.all(rows.map(toOwnerInvoiceView)),
    locked: await isOrganizerBillingLocked(
      session.organizerId,
      serviceFeeGracePeriodDays,
    ),
  };
}

/** Jumlah Biaya Layanan Pesanan `qris_pribadi` lunas sejak `since` yang cocok `scope`. */
async function sumQrisPribadiFeesSince(scope: SQL, since: Date) {
  const [accrual] = await db
    .select({
      total:
        sql<number>`coalesce(sum(${orders.platformFeeSnapshot}), 0)`.mapWith(
          Number,
        ),
    })
    .from(orders)
    .innerJoin(payments, eq(payments.orderId, orders.id))
    .innerJoin(merchants, eq(merchants.id, orders.merchantId))
    .where(
      and(
        scope,
        eq(payments.provider, "qris_pribadi"),
        inArray(orders.status, PAID_ORDER_STATUSES),
        gte(orders.paidAt, since),
      ),
    );
  return accrual?.total ?? 0;
}

function organizerOwnerName(organizationName: string): string {
  return `EO · ${organizationName} (Gerai Titipan)`;
}

/**
 * Akrual Biaya Layanan yang belum ditagih per pemilik tagihan (Admin): Lapak
 * `qris_pribadi`, plus EO untuk gabungan Gerai Titipannya (2026-10-23).
 * "Belum ditagih" = Pesanan lunas sejak `periodEnd` tagihan terakhir pemilik
 * itu (atau sejak pemilik terdaftar kalau belum pernah ditagih) — bukan lewat
 * kolom link (tidak ada `orders.serviceFeeInvoiceId`, akrual selalu dihitung
 * dari rentang waktu, konsisten dengan cron di src/lib/billing/service-fee.ts).
 */
export async function listQrisPribadiMerchantAccruals(): Promise<
  MerchantAccrualView[]
> {
  const session = await getAdminSession();
  if (!session) return [];

  const [merchantRows, organizerRows, { serviceFeeGracePeriodDays }] =
    await Promise.all([
      db.query.merchants.findMany({
        where: and(
          eq(merchants.paymentMode, "qris_pribadi"),
          isNull(merchants.managedByOrganizerId),
        ),
        orderBy: (row, { asc }) => [asc(row.stallName)],
      }),
      // EO yang punya Gerai Titipan (semuanya QRIS Pribadi).
      db
        .selectDistinct({
          id: eventOrganizers.id,
          organizationName: eventOrganizers.organizationName,
          createdAt: eventOrganizers.createdAt,
        })
        .from(eventOrganizers)
        .innerJoin(
          merchants,
          eq(merchants.managedByOrganizerId, eventOrganizers.id),
        )
        .orderBy(asc(eventOrganizers.organizationName)),
      getActivePlatformConfig(),
    ]);

  const merchantViews = merchantRows.map(async (merchant) => {
    const latestInvoice = await db.query.serviceFeeInvoices.findFirst({
      where: eq(serviceFeeInvoices.merchantId, merchant.id),
      orderBy: (row, { desc }) => [desc(row.periodEnd)],
    });
    return {
      ownerKey: `m:${merchant.id}`,
      ownerName: merchant.stallName,
      unbilledAmount: await sumQrisPribadiFeesSince(
        eq(orders.merchantId, merchant.id),
        latestInvoice?.periodEnd ?? merchant.createdAt,
      ),
      latestInvoiceStatus: latestInvoice?.status ?? null,
      locked: await isMerchantOrderingLocked(
        merchant.id,
        serviceFeeGracePeriodDays,
      ),
    };
  });
  const organizerViews = organizerRows.map(async (organizer) => {
    const latestInvoice = await db.query.serviceFeeInvoices.findFirst({
      where: eq(serviceFeeInvoices.organizerId, organizer.id),
      orderBy: (row, { desc }) => [desc(row.periodEnd)],
    });
    return {
      ownerKey: `eo:${organizer.id}`,
      ownerName: organizerOwnerName(organizer.organizationName),
      unbilledAmount: await sumQrisPribadiFeesSince(
        eq(merchants.managedByOrganizerId, organizer.id),
        latestInvoice?.periodEnd ?? organizer.createdAt,
      ),
      latestInvoiceStatus: latestInvoice?.status ?? null,
      locked: await isOrganizerBillingLocked(
        organizer.id,
        serviceFeeGracePeriodDays,
      ),
    };
  });

  return Promise.all([...merchantViews, ...organizerViews]);
}

/** Riwayat tagihan lintas-Lapak & EO (Admin). */
export async function listServiceFeeInvoicesForAdmin(): Promise<
  AdminServiceFeeInvoiceView[]
> {
  const session = await getAdminSession();
  if (!session) return [];

  const rows = await db
    .select({
      invoice: serviceFeeInvoices,
      stallName: merchants.stallName,
      organizationName: eventOrganizers.organizationName,
    })
    .from(serviceFeeInvoices)
    .leftJoin(merchants, eq(merchants.id, serviceFeeInvoices.merchantId))
    .leftJoin(
      eventOrganizers,
      eq(eventOrganizers.id, serviceFeeInvoices.organizerId),
    )
    .orderBy(desc(serviceFeeInvoices.periodStart));

  return rows.map(({ invoice, stallName, organizationName }) => ({
    id: invoice.id,
    ownerName: organizationName
      ? organizerOwnerName(organizationName)
      : (stallName ?? ""),
    periodStart: invoice.periodStart,
    periodEnd: invoice.periodEnd,
    amount: invoice.amount,
    dueAt: invoice.dueAt,
    status: invoice.status,
    paidAt: invoice.paidAt,
    voidReason: invoice.voidReason,
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
