import { QrMenuCard } from "@/components/merchant/QrMenuCard";
import { getMerchantQrMenu } from "@/server/merchants";

export default async function MerchantQrPage() {
  const qr = await getMerchantQrMenu();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-ink">QR Menu</h2>
        <p className="text-sm text-ink-muted">
          Cetak atau tempel QR ini di gerobak atau meja. Pembeli tinggal scan
          pakai kamera HP untuk melihat menu dan memesan langsung — tanpa unduh
          aplikasi, tanpa daftar akun.
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
