export type ServiceFeeInvoiceStatus = "belum_lunas" | "lunas" | "dibatalkan";

/** Tagihan Biaya Layanan milik Lapak sendiri (`/dashboard/pembayaran`). */
export type MerchantServiceFeeInvoiceView = {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  amount: number;
  dueAt: Date;
  status: ServiceFeeInvoiceStatus;
  paidAt: Date | null;
  /** QR untuk dipindai Pedagang membayar tagihan — cuma terisi kalau `belum_lunas` & charge sudah dibuat. */
  qrImageUrl: string | null;
};

/** Ringkasan akrual Biaya Layanan yang belum ditagih per Lapak `qris_pribadi` (Admin). */
export type MerchantAccrualView = {
  merchantId: string;
  stallName: string;
  unbilledAmount: number;
  latestInvoiceStatus: ServiceFeeInvoiceStatus | null;
  locked: boolean;
};

/** Riwayat tagihan lintas-Lapak (Admin). */
export type AdminServiceFeeInvoiceView = {
  id: string;
  merchantId: string;
  stallName: string;
  periodStart: Date;
  periodEnd: Date;
  amount: number;
  dueAt: Date;
  status: ServiceFeeInvoiceStatus;
  paidAt: Date | null;
  voidReason: string | null;
};

export type ServiceFeeInvoiceActionResult = { ok: boolean; message?: string };
