export type RegisterMerchantResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export type LoginMerchantResult =
  | { ok: true; status: "approved" }
  | { ok: true; status: "pending" | "rejected" | "suspended"; message: string }
  | { ok: false; message: string };

export type QrLapakView = {
  url: string;
  qrImageUrl: string;
};
