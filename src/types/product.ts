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
