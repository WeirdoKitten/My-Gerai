import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { merchantPushTokens } from "@/lib/db/schema";
import { parseJson, withMerchant } from "@/lib/mobile-api/handler";
import { apiError, apiOk } from "@/lib/mobile-api/respond";
import { isExpoPushToken } from "@/lib/push/expo-push";

const deviceSchema = z.object({
  pushToken: z
    .string()
    .max(200)
    .refine(isExpoPushToken, "Token notifikasi tidak valid."),
});

/**
 * Daftarkan token Expo Push HP ini untuk sesi yang sedang login. Kalau token
 * sudah terdaftar atas akun lain (HP ganti akun), pemiliknya dipindah.
 */
export async function PUT(request: Request) {
  return withMerchant(request, async ({ session }) => {
    if (session.client !== "mobile") {
      return apiError("forbidden", "Hanya untuk aplikasi Android.");
    }
    const input = await parseJson(request, deviceSchema);
    if (input instanceof Response) return input;

    await db
      .insert(merchantPushTokens)
      .values({
        merchantId: session.merchantId,
        sessionId: session.sessionId,
        token: input.pushToken,
      })
      .onConflictDoUpdate({
        target: merchantPushTokens.token,
        set: {
          merchantId: session.merchantId,
          sessionId: session.sessionId,
          updatedAt: sql`now()`,
        },
      });
    return apiOk({});
  });
}

/** Hapus token push milik sesi ini (contoh: Pedagang mematikan notifikasi di aplikasi). */
export async function DELETE(request: Request) {
  return withMerchant(request, async ({ session }) => {
    await db
      .delete(merchantPushTokens)
      .where(
        and(
          eq(merchantPushTokens.sessionId, session.sessionId),
          eq(merchantPushTokens.merchantId, session.merchantId),
        ),
      );
    return apiOk({});
  });
}
