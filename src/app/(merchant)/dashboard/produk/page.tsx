import { ProductManager } from "@/components/merchant/ProductManager";
import { Alert } from "@/components/ui/Alert";
import { getMerchantSession } from "@/lib/auth/session";
import { listMerchantProducts } from "@/server/products";

export default async function MerchantProductsPage() {
  const [products, session] = await Promise.all([
    listMerchantProducts(),
    getMerchantSession(),
  ]);
  const isProxyStall = !!session?.proxyOrganizerId;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-ink">Kelola Item</h2>
      {products.length === 0 ? (
        <Alert tone="info">
          {isProxyStall
            ? "Gerai Titipan belum bisa dipesan peserta sampai ada minimal 1 Item. Isi menu sesuai barang di toko aslinya; Harga Modal = harga beli di toko itu."
            : "Lapak kamu belum bisa dipakai Pembeli sampai ada minimal 1 Item. Tambahkan dulu di bawah ini."}
        </Alert>
      ) : null}
      <ProductManager initialProducts={products} isProxyStall={isProxyStall} />
    </div>
  );
}
