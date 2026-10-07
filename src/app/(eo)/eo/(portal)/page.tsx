import Link from "next/link";
import { CreateEventForm } from "@/components/eo/CreateEventForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { CalendarIcon } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/PageHeader";
import { listMyEvents } from "@/server/events";

export default async function EventOrganizerHomePage() {
  const eventList = await listMyEvents();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Event"
        subtitle="Satu QR untuk banyak Gerai. Peserta pesan & bayar dari HP, lalu tinggal ambil di Gerai."
      />

      {eventList.length === 0 ? (
        <EmptyState
          icon={<CalendarIcon className="size-10" />}
          title="Belum ada event"
          description="Buat event pertama kamu di bawah."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {eventList.map((event) => (
            <li key={event.id}>
              <Link href={`/eo/event/${event.id}`} className="block">
                <Card className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">
                      {event.name}
                    </p>
                    <p className="text-sm text-ink-muted">
                      {event.merchantCount} Gerai
                    </p>
                  </div>
                  <Badge tone={event.isActive ? "success" : "neutral"}>
                    {event.isActive ? "Aktif" : "Nonaktif"}
                  </Badge>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-ink">Buat event baru</h2>
        <Card>
          <CreateEventForm />
        </Card>
      </section>
    </div>
  );
}
