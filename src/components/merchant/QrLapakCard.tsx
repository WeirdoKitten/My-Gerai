import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { QrLapakView } from "@/types/merchant";

export function QrLapakCard({ qr }: { qr: QrLapakView }) {
  return (
    <Card pad="lg" className="flex flex-col items-center gap-3 text-center">
      {/* biome-ignore lint/performance/noImgElement: data URI, next/image tidak berlaku */}
      <img
        src={qr.qrImageUrl}
        alt="QR Lapak"
        className="size-52 rounded-control border border-line"
      />
      <p className="break-all text-xs text-ink-muted">{qr.url}</p>
      <a
        href={qr.qrImageUrl}
        download="qr-lapak.png"
        className={buttonClasses({ variant: "secondary", size: "sm" })}
      >
        Unduh QR Lapak
      </a>
    </Card>
  );
}
