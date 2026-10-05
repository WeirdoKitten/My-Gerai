import type { PreOrderRange } from "@/lib/schedule/pre-order-slots";

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
  /** Terisi = Item pre-order (dibuat sesuai pesanan). `null` = Item biasa. */
  preOrder: PreOrderRange | null;
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

/**
 * Pengaturan Pesanan Antar Lapak, dilihat Pembeli (tanpa sesi) di checkout
 * (Fase 11). `null` = Lapak tidak menerima antar saat ini (nonaktif, belum
 * ada titik GPS/Ongkir, atau Lapak tidak ada). Titik GPS Lapak memang sudah
 * publik (tombol "Buka di Peta" di halaman menu) — dipakai untuk menghitung
 * jarak di browser sebagai peringatan dini; server tetap menghitung ulang.
 */
export type StallDeliveryView = {
  fee: number;
  radiusKm: number;
  stallLatitude: number;
  stallLongitude: number;
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
  /** Terisi = Item pre-order. `null` = Item biasa. */
  preOrder: PreOrderRange | null;
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
