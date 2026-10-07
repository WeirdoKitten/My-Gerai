import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventMyOrders } from "@/components/buyer/EventMyOrders";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  HistoryIcon,
  MapPinIcon,
  StarIcon,
  StoreIcon,
} from "@/components/ui/icons";
import { formatRating } from "@/lib/review/rating";
import { getPublicEvent } from "@/server/events";

export default async function EventPage(props: PageProps<"/e/[eventSlug]">) {
  const { eventSlug } = await props.params;
  const event = await getPublicEvent(eventSlug);
  if (!event) notFound();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-strong">
          Belanja oleh-oleh
        </p>
        <h1 className="text-xl font-bold tracking-tight text-ink">
          {event.name}
        </h1>
        {event.location ? (
          <p className="flex items-center gap-1.5 text-sm text-ink-muted">
            <MapPinIcon className="size-4 shrink-0" />
            {event.location}
          </p>
        ) : null}
      </div>

      {event.description ? (
        <Card>
          <p className="whitespace-pre-line text-sm text-ink">
            {event.description}
          </p>
        </Card>
      ) : null}

      <EventMyOrders eventSlug={event.slug} />

      {!event.isActive ? (
        <EmptyState
          icon={<HistoryIcon className="size-10" />}
          title="Event sudah berakhir"
          description="Pemesanan lewat event ini sudah ditutup. Pesanan yang sudah dibayar tetap bisa diambil di Gerai."
        />
      ) : event.merchants.length === 0 ? (
        <EmptyState
          icon={<StoreIcon className="size-10" />}
          title="Belum ada Gerai"
          description="Penyelenggara belum menambahkan Gerai ke event ini."
        />
      ) : (
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="font-semibold text-ink">Pilih Gerai</h2>
            <p className="text-sm text-ink-muted">
              Pesan & bayar sekarang, ambil nanti di Gerai tanpa antre.
            </p>
          </div>
          {event.merchants.map((merchant) => (
            <Link
              key={merchant.slug}
              href={`/e/${event.slug}/${merchant.slug}`}
              className="block"
            >
              <Card pad="sm" className="flex items-center gap-3">
                {merchant.photoUrl ? (
                  <Image
                    src={merchant.photoUrl}
                    alt={merchant.stallName}
                    width={64}
                    height={64}
                    className="size-16 shrink-0 rounded-control object-cover"
                  />
                ) : (
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-control bg-brand-tint text-brand">
                    <StoreIcon className="size-7" />
                  </div>
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="truncate font-semibold text-ink">
                    {merchant.stallName}
                  </p>
                  <p className="flex items-center gap-1.5 truncate text-sm text-ink-muted">
                    {merchant.category}
                    {merchant.rating.average !== null ? (
                      <span className="inline-flex items-center gap-0.5 text-ink">
                        · <StarIcon filled className="size-3.5 text-brand" />
                        {formatRating(merchant.rating.average)}
                      </span>
                    ) : null}
                  </p>
                </div>
                <Badge tone={merchant.isOpen ? "success" : "neutral"}>
                  {merchant.isOpen ? "Buka" : "Tutup"}
                </Badge>
              </Card>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
