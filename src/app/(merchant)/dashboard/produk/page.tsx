import { ProductManager } from "@/components/merchant/ProductManager";
import { Alert } from "@/components/ui/Alert";
import { listMerchantProducts } from "@/server/products";

export default async function MerchantProductsPage() {
  const products = await listMerchantProducts();

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-ink">Kelola Item</h2>
      {products.length === 0 ? (
        <Alert tone="info">
          Lapak kamu belum bisa dipakai Pembeli sampai ada minimal 1 Item —
          tambahkan dulu di bawah ini.
        </Alert>
      ) : null}
      <ProductManager initialProducts={products} />
    </div>
  );
}
