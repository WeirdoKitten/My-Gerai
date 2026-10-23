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
  /** Payload QRIS mentah (sama isinya dengan `qrImageUrl`), untuk digambar ulang tajam di aplikasi. `null` kalau gateway hanya memberi URL gambar. */
  qrString: string | null;
};

/**
 * Ringkasan akrual Biaya Layanan yang belum ditagih per pemilik tagihan
 * (Admin): Lapak `qris_pribadi`, atau EO untuk gabungan Gerai Titipannya.
 */
export type MerchantAccrualView = {
  /** Kunci unik baris: `m:<merchantId>` atau `eo:<organizerId>`. */
  ownerKey: string;
  /** Nama Lapak, atau "EO · <nama EO> (Gerai Titipan)". */
  ownerName: string;
  unbilledAmount: number;
  latestInvoiceStatus: ServiceFeeInvoiceStatus | null;
  locked: boolean;
};

/** Riwayat tagihan lintas-Lapak & EO (Admin). */
export type AdminServiceFeeInvoiceView = {
  id: string;
  /** Nama Lapak, atau "EO · <nama EO> (Gerai Titipan)" untuk tagihan EO. */
  ownerName: string;
  periodStart: Date;
  periodEnd: Date;
  amount: number;
  dueAt: Date;
  status: ServiceFeeInvoiceStatus;
  paidAt: Date | null;
  voidReason: string | null;
};

export type ServiceFeeInvoiceActionResult = { ok: boolean; message?: string };
