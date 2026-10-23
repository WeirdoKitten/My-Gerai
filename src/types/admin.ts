export type LoginAdminResult = { ok: true } | { ok: false; message: string };

/** Bentuk hasil daftar Pedagang untuk Admin — tanpa `passwordHash`. */
export type AdminMerchantView = {
  id: string;
  slug: string;
  stallName: string;
  ownerName: string;
  category: string;
  /** `null` untuk Gerai Titipan (tanpa login sendiri). */
  phone: string | null;
  status: "pending" | "approved" | "rejected" | "suspended";
  rejectionReason: string | null;
  createdAt: Date;
  paymentMode: "gateway" | "qris_pribadi";
  qrisPhotoUrl: string | null;
  /** Nama EO pengelola kalau ini Gerai Titipan, `null` untuk Lapak biasa. */
  proxyOrganizerName: string | null;
};

export type ApproveMerchantResult = { ok: boolean; message?: string };
export type RejectMerchantResult = { ok: boolean; message?: string };
export type SetMerchantPaymentModeResult = { ok: boolean; message?: string };
export type SetProxyStallActiveResult = { ok: boolean; message?: string };
