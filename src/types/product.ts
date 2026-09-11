export type BuyerProductView = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  photoUrl: string | null;
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
  /** `null` = stok tidak dibatasi. */
  stock: number | null;
  photoUrl: string | null;
  status: "available" | "sold_out";
};

export type CreateProductResult =
  | { ok: true; productId: string }
  | { ok: false; message: string };

export type UpdateProductResult = { ok: boolean; message?: string };
export type SetProductStatusResult = { ok: boolean; message?: string };

export type UploadProductPhotoResult =
  | { ok: true; url: string }
  | { ok: false; message: string };
