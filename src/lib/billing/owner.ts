/**
 * Pemilik tagihan Biaya Layanan (2026-10-23): Lapak biasa ditagih per Lapak,
 * Gerai Titipan ditagih gabungan per EO pengelolanya. Fungsi murni supaya
 * bisa diuji tanpa database.
 */
export type BillingOwner =
  | { kind: "merchant"; merchantId: string }
  | { kind: "organizer"; organizerId: string };

export type AccrualRow = {
  merchantId: string;
  /** EO pengelola kalau Lapak ini Gerai Titipan, `null` untuk Lapak biasa. */
  organizerId: string | null;
  total: number;
};

/** Jumlahkan akrual per pemilik tagihan; total 0 dibuang (tidak ada yang ditagih). */
export function groupAccrualsByBillingOwner(
  rows: AccrualRow[],
): { owner: BillingOwner; total: number }[] {
  const groups = new Map<string, { owner: BillingOwner; total: number }>();
  for (const row of rows) {
    const owner: BillingOwner = row.organizerId
      ? { kind: "organizer", organizerId: row.organizerId }
      : { kind: "merchant", merchantId: row.merchantId };
    const key =
      owner.kind === "organizer"
        ? `eo:${owner.organizerId}`
        : `m:${owner.merchantId}`;
    const group = groups.get(key) ?? { owner, total: 0 };
    group.total += row.total;
    groups.set(key, group);
  }
  return [...groups.values()].filter((group) => group.total > 0);
}
