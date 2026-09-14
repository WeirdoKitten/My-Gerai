export type LoginAdminResult = { ok: true } | { ok: false; message: string };

/** Bentuk hasil daftar Pedagang untuk Admin — tanpa `passwordHash`. */
export type AdminMerchantView = {
  id: string;
  slug: string;
  stallName: string;
  ownerName: string;
  category: string;
  phone: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  rejectionReason: string | null;
  createdAt: Date;
  paymentMode: "gateway" | "qris_pribadi";
  qrisPhotoUrl: string | null;
};

export type ApproveMerchantResult = { ok: boolean; message?: string };
export type RejectMerchantResult = { ok: boolean; message?: string };
export type SetMerchantPaymentModeResult = { ok: boolean; message?: string };
