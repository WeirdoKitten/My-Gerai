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
