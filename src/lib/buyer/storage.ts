/**
 * Data kenyamanan Pembeli di localStorage (Fase 11) — BUKAN sumber kebenaran.
 * Pembeli tetap tanpa akun: Pesanan & data antar tersimpan di server, ini
 * cuma supaya (1) form checkout terisi otomatis di pesanan berikutnya dan
 * (2) link halaman status Pesanan tidak hilang kalau tab tertutup. Kalau
 * localStorage dihapus, Pembeli masih bisa lewat halaman Lacak Pesanan.
 * Semua akses dibungkus try/catch (private browsing / kuota penuh).
 */

const PROFILE_KEY = "mygerai_buyer_profile_v1";
const RECENT_ORDERS_KEY = "mygerai_recent_orders_v1";
// 20 (bukan 10) supaya Pesanan dari beberapa Gerai di satu event tidak tergeser.
const RECENT_ORDERS_LIMIT = 20;

export type BuyerProfile = {
  buyerName: string;
  buyerPhone: string;
  deliveryAddress: string;
  deliveryLandmark: string;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
};

export type RecentOrder = {
  orderId: string;
  orderCode: string;
  stallName: string;
  /** ISO string. */
  createdAt: string;
  /** Slug event asal Pesanan (Portal EO) — dipakai "Pesanan kamu di event ini". */
  eventSlug?: string | null;
};

function read(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Abaikan — fitur ini murni kenyamanan.
  }
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function loadBuyerProfile(): BuyerProfile | null {
  const raw = read(PROFILE_KEY);
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  return {
    buyerName: asString(data.buyerName),
    buyerPhone: asString(data.buyerPhone),
    deliveryAddress: asString(data.deliveryAddress),
    deliveryLandmark: asString(data.deliveryLandmark),
    deliveryLatitude: asNumberOrNull(data.deliveryLatitude),
    deliveryLongitude: asNumberOrNull(data.deliveryLongitude),
  };
}

/** Gabung dengan profil tersimpan — field yang tidak dikirim tetap dipertahankan. */
export function saveBuyerProfile(update: Partial<BuyerProfile>): void {
  const current = loadBuyerProfile() ?? {
    buyerName: "",
    buyerPhone: "",
    deliveryAddress: "",
    deliveryLandmark: "",
    deliveryLatitude: null,
    deliveryLongitude: null,
  };
  write(PROFILE_KEY, { ...current, ...update });
}

export function loadRecentOrders(): RecentOrder[] {
  const raw = read(RECENT_ORDERS_KEY);
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (entry): entry is RecentOrder =>
        !!entry &&
        typeof entry === "object" &&
        typeof entry.orderId === "string" &&
        typeof entry.orderCode === "string" &&
        typeof entry.stallName === "string" &&
        typeof entry.createdAt === "string",
    )
    .slice(0, RECENT_ORDERS_LIMIT);
}

/** Simpan/perbarui satu Pesanan di urutan teratas (terbaru dulu). */
export function rememberRecentOrder(order: RecentOrder): void {
  const rest = loadRecentOrders().filter(
    (entry) => entry.orderId !== order.orderId,
  );
  write(RECENT_ORDERS_KEY, [order, ...rest].slice(0, RECENT_ORDERS_LIMIT));
}
