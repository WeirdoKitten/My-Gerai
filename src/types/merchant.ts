export type RegisterMerchantResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export type LoginMerchantResult =
  | { ok: true; status: "approved" }
  | { ok: true; status: "pending" | "rejected" | "suspended"; message: string }
  | { ok: false; message: string };

export type QrMenuView = {
  url: string;
  qrImageUrl: string;
};

export type MerchantProfileView = {
  stallName: string;
  ownerName: string;
  category: string;
  /** Read-only di form profil (mengubah nomor HP = urusan auth, terpisah). */
  phone: string;
  payoutAccountInfo: string | null;
};

export type UpdateMerchantProfileResult = { ok: boolean; message?: string };

/**
 * Pengaturan pembayaran Lapak sendiri (`/dashboard/pembayaran`). `paymentMode`
 * read-only di sisi Pedagang — cuma Admin yang boleh mengubahnya (lihat
 * setMerchantPaymentMode). `storefrontLocked` dihitung lazy dari tagihan
 * Biaya Layanan yang menunggak (lihat isMerchantOrderingLocked).
 */
export type MerchantPaymentSettingsView = {
  paymentMode: "gateway" | "qris_pribadi";
  qrisPhotoUrl: string | null;
  storefrontLocked: boolean;
};

export type UploadQrisPhotoResult =
  | { ok: true; url: string }
  | { ok: false; message: string };
