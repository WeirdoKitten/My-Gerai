import type { QrLapakView } from "@/types/merchant";

export function QrLapakCard({ qr }: { qr: QrLapakView }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        QR Lapak
      </p>
      {/* biome-ignore lint/performance/noImgElement: data URI, next/image tidak berlaku untuk ini */}
      <img src={qr.qrImageUrl} alt="QR Lapak" className="h-48 w-48" />
      <p className="break-all text-center text-xs text-zinc-500 dark:text-zinc-400">
        {qr.url}
      </p>
      <a
        href={qr.qrImageUrl}
        download="qr-lapak.png"
        className="mt-1 rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
      >
        Unduh QR Lapak
      </a>
    </div>
  );
}
