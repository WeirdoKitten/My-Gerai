import { CheckoutGate } from "@/components/buyer/CheckoutGate";
import { CheckoutView } from "@/components/buyer/CheckoutView";
import { PageHeader } from "@/components/ui/PageHeader";
import { getActivePlatformConfig } from "@/server/config";

// Halaman ini query `platform_config` (Biaya Layanan) → butuh DB. Tanpa ini
// Next mencoba prerender saat `next build` (tidak ada `cookies()`/param dinamis
// yang otomatis membuatnya dinamis) → gagal di image Docker yang belum konek DB.
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const { platformFeeAmount } = await getActivePlatformConfig();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Checkout"
        subtitle="Periksa pesananmu, lalu isi data pemesan."
      />
      <CheckoutGate>
        <CheckoutView platformFeeAmount={platformFeeAmount} />
      </CheckoutGate>
    </div>
  );
}
