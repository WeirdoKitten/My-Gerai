export type MerchantBalanceView = {
  merchantId: string;
  stallName: string;
  balance: number;
};

export type AdminPayoutView = {
  id: string;
  merchantId: string;
  stallName: string;
  amount: number;
  note: string | null;
  settledAt: Date | null;
};

export type RecordPayoutResult = { ok: boolean; message?: string };

/** Saldo + riwayat Pencairan untuk Pedagang sendiri (`getMyPayoutSummary`). */
export type MerchantPayoutSummaryView = {
  /** Saldo yang belum dicairkan, hanya dari Pesanan lunas lewat gateway. */
  balance: number;
  payouts: {
    id: string;
    amount: number;
    /** Catatan Admin, mis. nomor referensi transfer. */
    note: string | null;
    settledAt: Date;
  }[];
};
