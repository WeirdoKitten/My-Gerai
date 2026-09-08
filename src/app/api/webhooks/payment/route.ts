import { eq } from "drizzle-orm";
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
    return new Response("invalid signature", { status: 403 });
  }

  const payment = await db.query.payments.findFirst({
    where: eq(payments.orderId, result.orderId),
  });
  // Balapan langka: notifikasi tiba sebelum baris `payments` sempat ditulis
  // `createOrder`. 404 → Midtrans retry (2x, jeda beberapa menit) — cukup.
  if (!payment || payment.referenceId !== result.referenceId) {
    return new Response("not found", { status: 404 });
  }

  // Simpan payload mentah untuk audit/debug (docs/DATA-MODEL.md §payments).
  await db
    .update(payments)
    .set({ rawPayload: JSON.stringify(body) })
    .where(eq(payments.orderId, result.orderId));

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
