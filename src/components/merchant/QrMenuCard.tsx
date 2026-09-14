import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import type { QrMenuView } from "@/types/merchant";

export function QrMenuCard({ qr }: { qr: QrMenuView }) {
  return (
    <Card pad="lg" className="flex flex-col items-center gap-3 text-center">
      {/* biome-ignore lint/performance/noImgElement: data URI, next/image tidak berlaku */}
      <img
        src={qr.qrImageUrl}
        alt="QR Menu"
        className="size-52 rounded-control border border-line"
      />
      <p className="break-all text-xs text-ink-muted">{qr.url}</p>
      <div className="flex items-center gap-2">
        <a
          href={qr.qrImageUrl}
          download="qr-menu.png"
          className={buttonClasses({ variant: "secondary", size: "sm" })}
        >
          Unduh QR Menu
        </a>
        <CopyButton value={qr.url} label="link menu" />
      </div>
    </Card>
  );
}
