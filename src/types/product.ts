export type ProductVariantOptionView = {
  id: string;
  name: string;
  /** Tambahan/pengurangan harga per unit terhadap harga dasar Item. */
  priceDelta: number;
};

/** Satu grup varian (mis. "Level Pedas") milik sebuah Item, beserta pilihannya. */
export type ProductVariantGroupView = {
  id: string;
  name: string;
  options: ProductVariantOptionView[];
};

export type BuyerProductView = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  photoUrl: string | null;
  /** `[]` = Item ini tidak punya varian, tampil & dipesan seperti biasa. */
  variantGroups: ProductVariantGroupView[];
};

/**
 * Bentuk hasil katalog Lapak untuk Pembeli — tidak ada `merchants.id`,
 * `phone`, `passwordHash`, `payoutAccountInfo`, dsb.
 */
export type StallCatalogView = {
  merchant: {
    slug: string;
    stallName: string;
    category: string;
    photoUrl: string | null;
    /** `false` = Lapak sedang tutup (manual atau jadwal) — katalog tetap tampil, checkout dikunci. */
    isOpen: boolean;
    /** Kapan Lapak buka lagi (ISO string), cuma terisi kalau `isOpen` false & ada jadwal. */
    reopensAt: string | null;
    /** Alamat fisik teks bebas, opsional — null = Pedagang belum isi. */
    address: string | null;
    /** Titik GPS Lapak, opsional — null = belum diisi. Dipakai tombol "Buka di Peta". */
    latitude: number | null;
    longitude: number | null;
  };
  products: BuyerProductView[];
};

/**
 * `reason: "locked"` = Lapak ada, `approved`, tapi sedang tidak menerima
 * Pesanan baru karena tagihan Biaya Layanan `qris_pribadi` menunggak lewat
 * masa tenggang (lihat isMerchantOrderingLocked). Dibedakan dari "not_found"
 * supaya halaman Pembeli bisa tampilkan pesan yang sesuai, bukan 404 generik.
 */
export type StallCatalogResult =
  | { ok: true; catalog: StallCatalogView }
  | { ok: false; reason: "not_found" | "locked" };

/** Metode pembayaran Lapak, dilihat Pembeli (tanpa sesi) untuk copy checkout. */
export type MerchantPaymentModeView = {
  paymentMode: "gateway" | "qris_pribadi";
} | null;

/** Item milik Lapak sendiri, ditampilkan di dashboard Pedagang (kelola Item). */
export type MerchantProductView = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  /** Harga modal (HPP), dipakai untuk hitung laba di Laporan Penjualan. `null` = belum diisi. */
  costPrice: number | null;
  /** `null` = stok tidak dibatasi. */
  stock: number | null;
  photoUrl: string | null;
  status: "available" | "sold_out";
  /** Jumlah grup varian Item ini (badge di daftar Item) — 0 = tidak ada varian. */
  variantGroupCount: number;
};

export type CreateProductResult =
  | { ok: true; productId: string }
  | { ok: false; message: string };

export type UpdateProductResult = { ok: boolean; message?: string };
export type SetProductStatusResult = { ok: boolean; message?: string };

export type UploadProductPhotoResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

export type SaveProductVariantGroupsResult = { ok: boolean; message?: string };
