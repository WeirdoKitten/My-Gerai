import { redirect } from "next/navigation";
import { DeliverySettingsForm } from "@/components/merchant/DeliverySettingsForm";
import { getMerchantSession } from "@/lib/auth/session";
import { getMerchantDeliverySettings } from "@/server/merchants";
import { hasAnyProduct } from "@/server/products";

export default async function MerchantDeliveryPage() {
  // Gerai Titipan: hanya dipesan lewat QR Event, selalu bayar lewat MyGerai,
  // dan tanpa antar — halaman ini tidak berlaku.
  if ((await getMerchantSession())?.proxyOrganizerId) redirect("/dashboard");
  if (!(await hasAnyProduct())) redirect("/dashboard/produk");

  const settings = await getMerchantDeliverySettings();
  if (!settings) return null;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-ink">Pengantaran</h2>
      <p className="text-sm text-ink-muted">
        Terima pesanan yang kamu antar sendiri ke alamat Pembeli. Ongkir masuk
        penuh ke kamu. Pesanan ambil sendiri tetap berjalan seperti biasa.
      </p>
      <DeliverySettingsForm initialSettings={settings} />
    </div>
  );
}
