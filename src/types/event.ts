import type { OrderStatus } from "@/lib/utils/order-status";
import type { PublicMerchantListItem } from "@/types/merchant";

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
  items: { name: string; qty: number; variants: string[] }[];
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
