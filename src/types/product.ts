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

/** Item milik Lapak sendiri, ditampilkan di dashboard Pedagang (kelola Item). */
export type MerchantProductView = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  status: "available" | "sold_out";
};

export type CreateProductResult =
  | { ok: true; productId: string }
  | { ok: false; message: string };

export type UpdateProductResult = { ok: boolean; message?: string };
export type SetProductStatusResult = { ok: boolean; message?: string };
