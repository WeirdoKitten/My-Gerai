import Link from "next/link";
import { CreateEventForm } from "@/components/eo/CreateEventForm";
import { EventOrganizerQrisUploader } from "@/components/eo/EventOrganizerQrisUploader";
import { ServiceFeeInvoiceList } from "@/components/merchant/ServiceFeeInvoiceList";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { CalendarIcon } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/PageHeader";
import { getMyEventOrganizerQris } from "@/server/event-organizers";
import { listMyEvents } from "@/server/events";
import { listMyEventOrganizerServiceFeeInvoices } from "@/server/service-fee-invoices";

export default async function EventOrganizerHomePage() {
  const [eventList, qris, billing] = await Promise.all([
    listMyEvents(),
    getMyEventOrganizerQris(),
    listMyEventOrganizerServiceFeeInvoices(),
  ]);
  const qrisPhotoUrl = qris?.qrisPhotoUrl ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Event"
        subtitle="Satu QR untuk banyak Gerai. Peserta pesan & bayar dari HP, lalu tinggal ambil di Gerai."
      />

      {qrisPhotoUrl ? null : (
        <Alert tone="warning">
          Unggah QRIS uang jasa titipan di bawah supaya kamu bisa membuat Gerai
          Titipan untuk toko yang belum terdaftar di MyGerai.
        </Alert>
      )}
      {billing?.locked ? (
        <Alert tone="error">
          Gerai Titipan kamu sedang tidak menerima Pesanan karena tagihan Biaya
          Layanan menunggak. Bayar tagihan di bawah untuk membukanya kembali.
        </Alert>
      ) : null}

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

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-semibold text-ink">QRIS uang jasa titipan</h2>
          <p className="text-sm text-ink-muted">
            Pembeli di semua Gerai Titipan kamu membayar langsung ke QRIS ini.
            Tandai Lunas di antrean Gerai setelah uang masuk.
          </p>
        </div>
        <Card>
          <EventOrganizerQrisUploader initialUrl={qrisPhotoUrl} />
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-semibold text-ink">Tagihan Biaya Layanan</h2>
          <p className="text-sm text-ink-muted">
            Biaya Layanan Pesanan Gerai Titipan ditagih seminggu sekali,
            gabungan semua Gerai Titipan kamu.
          </p>
        </div>
        <ServiceFeeInvoiceList
          initialInvoices={billing?.invoices ?? []}
          owner="eo"
        />
      </section>
    </div>
  );
}
