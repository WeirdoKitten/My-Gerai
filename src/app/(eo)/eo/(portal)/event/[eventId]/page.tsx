import Link from "next/link";
import { notFound } from "next/navigation";
import { EventMerchantPicker } from "@/components/eo/EventMerchantPicker";
import { EventOrderList } from "@/components/eo/EventOrderList";
import { EventSettingsForm } from "@/components/eo/EventSettingsForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { DownloadQrPosterButton } from "@/components/ui/DownloadQrPosterButton";
import {
  getEventDetail,
  listEventOrders,
  listSelectableMerchants,
} from "@/server/events";

export default async function EventDetailPage(
  props: PageProps<"/eo/event/[eventId]">,
) {
  const { eventId } = await props.params;
  const [event, options, orders] = await Promise.all([
    getEventDetail(eventId),
    listSelectableMerchants(),
    listEventOrders(eventId),
  ]);
  if (!event || !orders) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/eo"
          className="self-start text-sm font-semibold text-brand-strong"
        >
          ← Semua event
        </Link>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold tracking-tight text-ink">
            {event.name}
          </h1>
          <Badge tone={event.isActive ? "success" : "neutral"}>
            {event.isActive ? "Aktif" : "Nonaktif"}
          </Badge>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-ink">QR Event</h2>
        <Card pad="lg" className="flex flex-col items-center gap-3 text-center">
          {/* biome-ignore lint/performance/noImgElement: data URI, next/image tidak berlaku */}
          <img
            src={event.qrImageUrl}
            alt="Poster QR Event"
            className="w-full max-w-xs drop-shadow-xl"
          />
          <p className="break-all text-xs text-ink-muted">{event.url}</p>
          <div className="flex items-center gap-2">
            <DownloadQrPosterButton
              svgDataUrl={event.qrImageUrl}
              filename={`qr-event-${event.slug}.png`}
              label="Unduh QR Event"
              variant="secondary"
              size="sm"
              fullWidth={false}
            />
            <CopyButton value={event.url} label="link event" />
          </div>
          <p className="text-xs text-ink-muted">
            Bagikan ke peserta (cetak, tempel di bis, atau kirim di grup).
          </p>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-semibold text-ink">Gerai di event ini</h2>
          <p className="text-sm text-ink-muted">
            Peserta hanya bisa memesan dari Gerai yang sedang buka.
          </p>
        </div>
        <EventMerchantPicker
          eventId={event.id}
          initialSelected={event.merchants}
          options={options}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-ink">Pesanan peserta</h2>
        <EventOrderList eventId={event.id} initialOrders={orders} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-ink">Pengaturan event</h2>
        <Card>
          <EventSettingsForm event={event} />
        </Card>
      </section>
    </div>
  );
}
