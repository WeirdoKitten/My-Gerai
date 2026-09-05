"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { getAdminSession } from "@/lib/auth/admin-session";
import { db } from "@/lib/db/client";
import { merchants, orders, payouts } from "@/lib/db/schema";
import { formatRupiah } from "@/lib/utils/money";
import {
  type RecordPayoutInput,
  recordPayoutSchema,
} from "@/lib/validation/payout.schema";
import type {
  AdminPayoutView,
  MerchantBalanceView,
  RecordPayoutResult,
} from "@/types/payout";

/** Status Pesanan yang dananya sudah dianggap milik Pedagang (lihat DATA-MODEL.md §payouts). */
const BALANCE_ELIGIBLE_STATUSES = [
  "dibayar",
  "diproses",
  "siap_diambil",
  "selesai",
] as const;

/**
 * Saldo Pedagang saat ini = SUM(orders.total_for_merchant status eligible)
 * - SUM(payouts.amount status selesai). Dihitung ulang di server, tidak
 * pernah dipercaya dari klien — dipakai sebagai guard overpayment di
 * `recordPayout`.
 */
async function getMerchantBalance(
  executor:
    | Parameters<Parameters<(typeof db)["transaction"]>[0]>[0]
    | typeof db,
  merchantId: string,
): Promise<number> {
  const [orderSum] = await executor
    .select({
      total: sql<number>`coalesce(sum(${orders.totalForMerchant}), 0)`.mapWith(
        Number,
      ),
    })
    .from(orders)
    .where(
      and(
        eq(orders.merchantId, merchantId),
        inArray(orders.status, BALANCE_ELIGIBLE_STATUSES),
      ),
    );

  const [payoutSum] = await executor
    .select({
      total: sql<number>`coalesce(sum(${payouts.amount}), 0)`.mapWith(Number),
    })
    .from(payouts)
    .where(
      and(eq(payouts.merchantId, merchantId), eq(payouts.status, "selesai")),
    );

  return (orderSum?.total ?? 0) - (payoutSum?.total ?? 0);
}

/** Saldo semua Pedagang — dua query GROUP BY terpisah, digabung di JS (hindari fan-out JOIN). */
export async function listMerchantBalances(): Promise<MerchantBalanceView[]> {
  const session = await getAdminSession();
  if (!session) return [];

  const merchantRows = await db.query.merchants.findMany({
    orderBy: (row, { asc }) => [asc(row.stallName)],
  });

  const orderSums = await db
    .select({
      merchantId: orders.merchantId,
      total: sql<number>`coalesce(sum(${orders.totalForMerchant}), 0)`.mapWith(
        Number,
      ),
    })
    .from(orders)
    .where(inArray(orders.status, BALANCE_ELIGIBLE_STATUSES))
    .groupBy(orders.merchantId);

  const payoutSums = await db
    .select({
      merchantId: payouts.merchantId,
      total: sql<number>`coalesce(sum(${payouts.amount}), 0)`.mapWith(Number),
    })
    .from(payouts)
    .where(eq(payouts.status, "selesai"))
    .groupBy(payouts.merchantId);

  const orderTotalById = new Map(
    orderSums.map((row) => [row.merchantId, row.total]),
  );
  const payoutTotalById = new Map(
    payoutSums.map((row) => [row.merchantId, row.total]),
  );

  return merchantRows.map((merchant) => ({
    merchantId: merchant.id,
    stallName: merchant.stallName,
    balance:
      (orderTotalById.get(merchant.id) ?? 0) -
      (payoutTotalById.get(merchant.id) ?? 0),
  }));
}

export async function listPayoutsForAdmin(): Promise<AdminPayoutView[]> {
  const session = await getAdminSession();
  if (!session) return [];

  const rows = await db.query.payouts.findMany({
    orderBy: (row, { desc }) => [desc(row.createdAt)],
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
    amount: row.amount,
    note: row.note,
    settledAt: row.settledAt,
  }));
}

export async function recordPayout(
  input: RecordPayoutInput,
): Promise<RecordPayoutResult> {
  const parsed = recordPayoutSchema.safeParse(input);
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

  const merchant = await db.query.merchants.findFirst({
    where: eq(merchants.id, parsed.data.merchantId),
  });
  if (!merchant) {
    return { ok: false, message: "Pedagang tidak ditemukan." };
  }

  try {
    await db.transaction(async (tx) => {
      // Advisory lock per-Pedagang: menyerialkan recordPayout yang bersamaan
      // untuk Pedagang yang sama, supaya cek saldo di bawah tidak kena TOCTOU
      // race (dua pencairan lolos guard bersamaan lalu keduanya ter-insert).
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${parsed.data.merchantId})::bigint)`,
      );

      const balance = await getMerchantBalance(tx, parsed.data.merchantId);
      if (parsed.data.amount > balance) {
        throw new Error(
          `Nominal melebihi Saldo Pedagang saat ini (${formatRupiah(balance)}).`,
        );
      }

      await tx.insert(payouts).values({
        merchantId: parsed.data.merchantId,
        amount: parsed.data.amount,
        status: "selesai",
        note: parsed.data.note ?? null,
        settledAt: new Date(),
      });
    });
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Gagal mencatat Pencairan.",
    };
  }

  return { ok: true };
}
