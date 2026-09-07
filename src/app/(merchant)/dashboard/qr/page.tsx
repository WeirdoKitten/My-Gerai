import { QrLapakCard } from "@/components/merchant/QrLapakCard";
import { getMerchantQrLapak } from "@/server/merchants";

export default async function MerchantQrPage() {
  const qr = await getMerchantQrLapak();

  return (
    <div className="flex max-w-md flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-ink">QR Lapak</h2>
        <p className="text-sm text-ink-muted">
          Cetak atau tempel QR ini di Lapak. Pembeli tinggal scan untuk melihat
          menu dan memesan.
        </p>
      </div>
      {qr ? (
        <QrLapakCard qr={qr} />
      ) : (
        <p className="text-sm text-ink-muted">QR Lapak belum tersedia.</p>
      )}
    </div>
  );
}
