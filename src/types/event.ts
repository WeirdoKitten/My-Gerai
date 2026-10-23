import type { OrderStatus } from "@/lib/utils/order-status";
import type { PublicMerchantListItem } from "@/types/merchant";
import type { OrderItemSubstitutionView } from "@/types/order";

export type RegisterEventOrganizerResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export type LoginEventOrganizerResult =
  | { ok: true; status: "approved" }
  | { ok: true; status: "pending" | "rejected" | "suspended"; message: string }
  | { ok: false; message: string };

/** Baris EO di panel Admin (`/admin/eo`). */
export type AdminEventOrganizerView = {
  id: string;
  organizationName: string;
  contactName: string;
  phone: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  rejectionReason: string | null;
  createdAt: Date;
  eventCount: number;
};

export type EventOrganizerActionResult = { ok: boolean; message?: string };

/** QRIS "uang jasa titipan" EO, dipakai semua Gerai Titipannya (2026-10-23). */
export type EventOrganizerQrisView = {
  /** `null` = belum diunggah, EO belum bisa membuat Gerai Titipan. */
  qrisPhotoUrl: string | null;
};

export type UploadEventOrganizerQrisResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

/** Ringkasan event di daftar `/eo`. */
export type EventListItem = {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  merchantCount: number;
  createdAt: Date;
};

/** Gerai anggota event (dipakai pemilih Gerai di portal EO). */
export type EventMerchantOption = {
  id: string;
  slug: string;
  stallName: string;
  category: string;
  /** Gerai Titipan milik EO yang sedang login (hanya EO itu yang bisa melihatnya). */
  isProxy: boolean;
};

/** Detail event untuk halaman kelola `/eo/event/[eventId]`. */
export type EventDetailView = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  location: string | null;
  isActive: boolean;
  url: string;
  qrImageUrl: string;
  merchants: EventMerchantOption[];
};

export type CreateEventResult =
  | { ok: true; eventId: string }
  | { ok: false; message: string };

export type EventActionResult = { ok: boolean; message?: string };

/** Pesanan event di portal EO — tanpa no HP/alamat Pembeli. */
export type EventOrderView = {
  id: string;
  orderCode: string;
  buyerName: string;
  stallName: string;
  status: OrderStatus;
  createdAt: Date;
  scheduledFor: Date | null;
  items: {
    name: string;
    qty: number;
    variants: string[];
    substitution: OrderItemSubstitutionView | null;
  }[];
};

export type CreateProxyStallResult =
  | { ok: true; merchant: EventMerchantOption }
  /** `needsQris` = EO belum mengunggah QRIS, UI membuka pop-up unggah. */
  | { ok: false; message: string; needsQris?: boolean };

/** Uang Gerai Titipan milik EO sendiri (Rupiah). */
export type ProxyStallSales = {
  /** Jumlah `subtotal` Pesanan (harga jual Item, tanpa Biaya Layanan). */
  revenue: number;
  /** Harga beli Item di toko asli; Item `tidak_tersedia` tidak dihitung. */
  cost: number;
  /** Uang Item `tidak_tersedia` yang wajib dikembalikan EO secara manual. */
  refundDue: number;
  /** `revenue - cost - refundDue`. */
  profit: number;
  /** Ada Item terjual tanpa harga beli, jadi `cost`/`profit` belum lengkap. */
  profitIncomplete: boolean;
};

/** Ringkasan penjualan event untuk EO (`/eo/event/[eventId]`). */
export type EventSalesSummary = {
  totalOrders: number;
  stalls: {
    merchantId: string;
    stallName: string;
    isProxy: boolean;
    orderCount: number;
    /** Hanya untuk Gerai Titipan milik EO ini; Gerai asli cukup jumlah Pesanan. */
    sales: ProxyStallSales | null;
  }[];
  /** Jumlah semua Gerai Titipan, `null` kalau event tidak punya Gerai Titipan. */
  proxyTotals: ProxyStallSales | null;
};

/** Halaman publik event `/e/[eventSlug]`. */
export type PublicEventView = {
  slug: string;
  name: string;
  description: string | null;
  location: string | null;
  isActive: boolean;
  merchants: PublicMerchantListItem[];
};

/** Info event yang diikuti Gerai, tampil di Profil Pedagang. */
export type MerchantEventInfo = {
  name: string;
  slug: string;
  organizationName: string;
  isActive: boolean;
};
