import { describe, expect, it, vi } from "vitest";
import {
  MOBILE_SESSION_DURATION_MS,
  parseBearerToken,
  renewedMobileExpiry,
} from "@/lib/auth/bearer";
import {
  apiError,
  apiOk,
  fromActionResult,
  UNAUTHORIZED_MESSAGE,
} from "@/lib/mobile-api/respond";
import { isExpoPushToken, sendExpoPush } from "@/lib/push/expo-push";
import { buildOrderPaidMessages } from "@/lib/push/messages";
import { RATE_LIMIT_MESSAGE } from "@/lib/rate-limit/limiter";

const DAY = 24 * 60 * 60 * 1000;

describe("parseBearerToken", () => {
  const token = "a".repeat(43);

  it("mengambil token dari header Bearer", () => {
    expect(parseBearerToken(`Bearer ${token}`)).toBe(token);
  });

  it("menolak header kosong, skema lain, dan karakter asing", () => {
    expect(parseBearerToken(null)).toBeNull();
    expect(parseBearerToken(`Basic ${token}`)).toBeNull();
    expect(parseBearerToken("Bearer ")).toBeNull();
    expect(parseBearerToken(`Bearer ${token}; drop`)).toBeNull();
    expect(parseBearerToken("Bearer pendek")).toBeNull();
  });
});

describe("renewedMobileExpiry", () => {
  const now = new Date("2026-10-07T00:00:00Z");

  it("tidak memperpanjang kalau sisa umur masih ≥ 60 hari", () => {
    const expiresAt = new Date(now.getTime() + 80 * DAY);
    expect(renewedMobileExpiry(expiresAt, now)).toBeNull();
  });

  it("memperpanjang ke 90 hari dari sekarang kalau sisa umur < 60 hari", () => {
    const expiresAt = new Date(now.getTime() + 10 * DAY);
    expect(renewedMobileExpiry(expiresAt, now)?.getTime()).toBe(
      now.getTime() + MOBILE_SESSION_DURATION_MS,
    );
  });
});

describe("respons API mobile", () => {
  it("apiOk dan apiError memakai format tunggal", async () => {
    const ok = apiOk({ a: 1 });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ ok: true, data: { a: 1 } });

    const err = apiError("validation", "Nama wajib diisi.");
    expect(err.status).toBe(422);
    expect(await err.json()).toEqual({
      ok: false,
      error: { code: "validation", message: "Nama wajib diisi." },
    });
  });

  it("fromActionResult memetakan hasil Server Action ke status HTTP", async () => {
    const ok = fromActionResult({ ok: true, message: "Berhasil." });
    expect(await ok.json()).toEqual({
      ok: true,
      data: { message: "Berhasil." },
    });

    expect(
      fromActionResult({ ok: false, message: RATE_LIMIT_MESSAGE }).status,
    ).toBe(429);
    expect(
      fromActionResult({ ok: false, message: UNAUTHORIZED_MESSAGE }).status,
    ).toBe(401);
    expect(
      fromActionResult({ ok: false, message: "Pesanan tidak ditemukan." })
        .status,
    ).toBe(404);
    expect(
      fromActionResult({ ok: false, message: "Status tidak bisa diubah." })
        .status,
    ).toBe(400);
  });
});

describe("push Pesanan lunas", () => {
  const order = { id: "o-1", orderCode: "K7QX9MB4", totalForMerchant: 25000 };

  it("isi notifikasi hanya kode + total, tanpa data Pembeli", () => {
    const [message] = buildOrderPaidMessages(["ExponentPushToken[abc]"], order);
    expect(message.title).toBe("Pesanan baru lunas");
    expect(message.body).toContain("K7QX9MB4");
    expect(message.body).toContain("25.000");
    expect(message.data).toEqual({ type: "order_paid", orderId: "o-1" });
    expect(message.channelId).toBe("pesanan");
  });

  it("isExpoPushToken hanya menerima format token Expo", () => {
    expect(isExpoPushToken("ExponentPushToken[xXyY_12-3]")).toBe(true);
    expect(isExpoPushToken("ExpoPushToken[abc]")).toBe(true);
    expect(isExpoPushToken("fcm-token-mentah")).toBe(false);
    expect(isExpoPushToken("ExponentPushToken[abc]x")).toBe(false);
  });

  it("sendExpoPush memecah per 100 pesan dan mengumpulkan token DeviceNotRegistered", async () => {
    const tokens = Array.from(
      { length: 150 },
      (_, i) => `ExponentPushToken[t${i}]`,
    );
    const messages = buildOrderPaidMessages(tokens, order);
    const fetchImpl = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const chunk = JSON.parse(String(init?.body)) as { to: string }[];
      return Response.json({
        data: chunk.map((m) =>
          m.to === "ExponentPushToken[t120]"
            ? {
                status: "error",
                message: "not registered",
                details: { error: "DeviceNotRegistered" },
              }
            : { status: "ok", id: m.to },
        ),
      });
    });

    const result = await sendExpoPush(messages, {
      accessToken: "rahasia",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const firstInit = fetchImpl.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(firstInit.body))).toHaveLength(100);
    expect((firstInit.headers as Record<string, string>).authorization).toBe(
      "Bearer rahasia",
    );
    expect(result.invalidTokens).toEqual(["ExponentPushToken[t120]"]);
  });

  it("sendExpoPush melempar error kalau Expo membalas non-2xx", async () => {
    const fetchImpl = vi.fn(async () => new Response("down", { status: 503 }));
    await expect(
      sendExpoPush(buildOrderPaidMessages(["ExponentPushToken[a]"], order), {
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toThrow("503");
  });
});
