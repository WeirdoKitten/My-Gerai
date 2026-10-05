/** Ringkasan rating sebuah Lapak. `average` = `null` kalau belum ada ulasan. */
export type RatingSummary = {
  /** Rata-rata dibulatkan 1 desimal (mis. 4.7). */
  average: number | null;
  count: number;
};

/** Ulasan yang tampil publik di halaman menu — nama Pembeli sudah disamarkan. */
export type PublicReviewView = {
  id: string;
  rating: number;
  comment: string | null;
  /** Hasil `maskBuyerName` (mis. "Budi S."), bukan nama lengkap. */
  buyerDisplayName: string;
  createdAt: string;
};

/** Ulasan milik Pesanan sendiri, ditampilkan di halaman status Pesanan. */
export type OrderReviewView = {
  rating: number;
  comment: string | null;
  createdAt: string;
};

/** Ulasan di dashboard Pedagang — nama lengkap & Kode Pesanan ikut tampil. */
export type MerchantReviewView = {
  id: string;
  rating: number;
  comment: string | null;
  buyerName: string;
  orderCode: string;
  createdAt: string;
};

export type MerchantReviewsPage = {
  summary: RatingSummary;
  /** Jumlah ulasan per bintang, indeks 0 = 1 bintang ... indeks 4 = 5 bintang. */
  distribution: [number, number, number, number, number];
  reviews: MerchantReviewView[];
};

export type SubmitOrderReviewResult =
  | { ok: true }
  | { ok: false; message: string };
