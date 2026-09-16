import { Card } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { DownloadQrPosterButton } from "@/components/ui/DownloadQrPosterButton";
import type { QrMenuView } from "@/types/merchant";

export function QrMenuCard({ qr }: { qr: QrMenuView }) {
  return (
    <Card pad="lg" className="flex flex-col items-center gap-3 text-center">
      {/* biome-ignore lint/performance/noImgElement: data URI, next/image tidak berlaku */}
      <img
        src={qr.qrImageUrl}
        alt="Poster QR Menu"
        className="w-full max-w-xs drop-shadow-xl"
      />
      <p className="break-all text-xs text-ink-muted">{qr.url}</p>
      <div className="flex items-center gap-2">
        <DownloadQrPosterButton
          svgDataUrl={qr.qrImageUrl}
          filename="qr-menu.png"
          label="Unduh QR Menu"
          variant="secondary"
          size="sm"
          fullWidth={false}
        />
        <CopyButton value={qr.url} label="link menu" />
      </div>
    </Card>
  );
}
