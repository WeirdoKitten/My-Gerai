export type PlatformConfigView = {
  platformFeeAmount: number;
  orderExpiryMinutes: number;
};

export type PlatformConfigHistoryEntry = {
  id: string;
  key: string;
  value: string;
  effectiveFrom: Date;
};

export type UpdatePlatformConfigResult = { ok: boolean; message?: string };
