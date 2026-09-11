export type PlatformConfigView = {
  platformFeeAmount: number;
  orderExpiryMinutes: number;
  /** Panjang siklus tagihan Biaya Layanan Lapak `qris_pribadi` (hari). */
  serviceFeeBillingCycleDays: number;
  /** Masa tenggang setelah tagihan jatuh tempo sebelum Lapak dikunci (hari). */
  serviceFeeGracePeriodDays: number;
};

export type PlatformConfigHistoryEntry = {
  id: string;
  key: string;
  value: string;
  effectiveFrom: Date;
};

export type UpdatePlatformConfigResult = { ok: boolean; message?: string };
