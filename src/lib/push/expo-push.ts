/*
 * Klien Expo Push Service (https://docs.expo.dev/push-notifications/sending-notifications/).
 * Murni `fetch`, tanpa DB, supaya bisa di-unit-test dengan fetch tiruan.
 */

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const MAX_MESSAGES_PER_REQUEST = 100;

/** Channel notifikasi Android untuk Pesanan; dibuat aplikasi dengan id yang sama. */
export const ORDER_CHANNEL_ID = "pesanan";

export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data: Record<string, string>;
  channelId: string;
  priority: "high";
  sound: "default";
};

type ExpoPushTicket =
  | { status: "ok"; id: string }
  | { status: "error"; message: string; details?: { error?: string } };

export function isExpoPushToken(token: string): boolean {
  return /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(token);
}

/**
 * Kirim pesan ke Expo dalam potongan 100. Mengembalikan token yang ditolak
 * permanen (`DeviceNotRegistered`, aplikasi dihapus/izin dicabut) supaya
 * pemanggil bisa menghapusnya dari DB.
 */
export async function sendExpoPush(
  messages: ExpoPushMessage[],
  options: { accessToken?: string; fetchImpl?: typeof fetch } = {},
): Promise<{ invalidTokens: string[] }> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const invalidTokens: string[] = [];

  for (let i = 0; i < messages.length; i += MAX_MESSAGES_PER_REQUEST) {
    const chunk = messages.slice(i, i + MAX_MESSAGES_PER_REQUEST);
    const response = await fetchImpl(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...(options.accessToken
          ? { authorization: `Bearer ${options.accessToken}` }
          : {}),
      },
      body: JSON.stringify(chunk),
    });
    if (!response.ok) {
      throw new Error(`Expo push gagal: HTTP ${response.status}`);
    }

    const { data: tickets } = (await response.json()) as {
      data: ExpoPushTicket[];
    };
    tickets.forEach((ticket, index) => {
      if (
        ticket.status === "error" &&
        ticket.details?.error === "DeviceNotRegistered"
      ) {
        invalidTokens.push(chunk[index].to);
      } else if (ticket.status === "error") {
        console.warn("[push] tiket Expo gagal:", ticket.message);
      }
    });
  }

  return { invalidTokens };
}
