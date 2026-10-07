import { notFound, redirect } from "next/navigation";
import { StallMenu } from "@/components/buyer/StallMenu";
import { getPublicEvent } from "@/server/events";

export default async function EventStallMenuPage(
  props: PageProps<"/e/[eventSlug]/[stallSlug]">,
) {
  const { eventSlug, stallSlug } = await props.params;
  const event = await getPublicEvent(eventSlug);
  if (!event) notFound();

  // Event sudah nonaktif atau Gerai bukan anggota -> menu biasa (tanpa
  // konteks event), supaya tautan lama tetap berguna.
  if (!event.isActive || !event.merchants.some((m) => m.slug === stallSlug)) {
    redirect(`/menu/${stallSlug}`);
  }

  return (
    <StallMenu
      stallSlug={stallSlug}
      event={{ slug: event.slug, name: event.name }}
    />
  );
}
