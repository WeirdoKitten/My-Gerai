import { redirect } from "next/navigation";
import { QrMenuCard } from "@/components/merchant/QrMenuCard";
import { getMerchantSession } from "@/lib/auth/session";
import { getMerchantQrMenu } from "@/server/merchants";
import { hasAnyProduct } from "@/server/products";

export default async function MerchantQrPage() {
  // Gerai Titipan: hanya dipesan lewat QR Event, selalu bayar lewat MyGerai,
  // dan tanpa antar — halaman ini tidak berlaku.
  if ((await getMerchantSession())?.proxyOrganizerId) redirect("/dashboard");
  if (!(await hasAnyProduct())) redirect("/dashboard/produk");

  const qr = await getMerchantQrMenu();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-ink">QR Menu</h2>
        <p className="text-sm text-ink-muted">
          Cetak atau tempel QR ini di gerobak atau meja. Pembeli tinggal scan
          pakai kamera HP untuk melihat menu dan memesan langsung.
        </p>
      </div>
      {qr ? (
        <QrMenuCard qr={qr} />
      ) : (
        <p className="text-sm text-ink-muted">QR Menu belum tersedia.</p>
      )}
    </div>
  );
}
