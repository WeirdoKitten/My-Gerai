import { EventOrganizerApprovalList } from "@/components/admin/EventOrganizerApprovalList";
import { PageHeader } from "@/components/ui/PageHeader";
import { listEventOrganizersForAdmin } from "@/server/event-organizers";

export default async function AdminEventOrganizersPage() {
  const organizers = await listEventOrganizersForAdmin();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Event Organizer"
        subtitle="EO membuat event berisi banyak Gerai dengan satu QR."
      />
      <EventOrganizerApprovalList initialOrganizers={organizers} />
    </div>
  );
}
