import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { payments } from "@/lib/db/schema";
import { getPaymentProvider } from "@/lib/payment";
import { markPaymentTerminal, settleOrderPayment } from "@/lib/payment/settle";

/**
 * Notifikasi pembayaran dari gateway (Midtrans Payment Notification URL).
 * TIDAK ada sesi — gerbangnya adalah verifikasi keaslian di
 * `PaymentProvider.handleCallback` (Midtrans: `signature_key` SHA512). Payload
 * diperlakukan sebagai data tak tepercaya sampai itu lolos.
 * Lihat docs/RULES.md §7.2, docs/ARSITEKTUR-SISTEM.md ADR 2026-09-08.
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const result = await getPaymentProvider().handleCallback(body);
  if (!result) {
    console.warn("[webhook/payment] keaslian tidak terverifikasi — ditolak");
    return new Response("invalid signature", { status: 403 });
  }

  // `order_id` MyGerai selalu UUID. Notifikasi uji dari dashboard Midtrans
  // memakai `order_id` non-UUID (mis. "payment_notif_test_...") — balas 200
  // supaya tombol "Test" di dashboard tetap hijau, tanpa menyentuh DB.
  if (!z.uuid().safeParse(result.orderId).success) {
    console.warn(
      `[webhook/payment] order_id=${result.orderId} bukan UUID — kemungkinan notif uji, diabaikan`,
    );
    return new Response("ok", { status: 200 });
  }

  const payment = await db.query.payments.findFirst({
    where: eq(payments.orderId, result.orderId),
  });
  // Keaslian sudah lolos tapi Pesanannya tidak ada di sistem ini: Pesanan
  // yang sudah dibersihkan, atau `reference_id` tidak cocok. Balas 200
  // (bukan retry) + catat.
  if (!payment || payment.referenceId !== result.referenceId) {
    console.warn(
      `[webhook/payment] order_id=${result.orderId} tidak ditemukan / referenceId tidak cocok — diabaikan`,
    );
    return new Response("ok", { status: 200 });
  }

  // Simpan payload mentah untuk audit/debug (docs/DATA-MODEL.md §payments).
  await db
    .update(payments)
    .set({ rawPayload: JSON.stringify(body) })
    .where(eq(payments.orderId, result.orderId));

  console.log(
    `[webhook/payment] order_id=${result.orderId} status=${result.status}`,
  );

  switch (result.status) {
    case "success":
      await settleOrderPayment(result.orderId);
      break;
    case "expired":
      await markPaymentTerminal(result.orderId, "expired");
      break;
    case "failed":
      await markPaymentTerminal(result.orderId, "failed");
      break;
    case "pending":
      break;
  }

  return new Response("ok", { status: 200 });
}
