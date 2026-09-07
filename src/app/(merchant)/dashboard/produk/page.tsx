import { ProductManager } from "@/components/merchant/ProductManager";
import { listMerchantProducts } from "@/server/products";

export default async function MerchantProductsPage() {
  const products = await listMerchantProducts();

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-ink">Kelola Item</h2>
      <ProductManager initialProducts={products} />
    </div>
  );
}
