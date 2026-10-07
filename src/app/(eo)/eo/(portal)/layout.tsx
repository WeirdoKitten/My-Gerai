import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { ToastProvider } from "@/components/ui/Toast";
import { Wordmark } from "@/components/ui/Wordmark";
import { getEventOrganizerSession } from "@/lib/auth/eo-session";
import { logoutEventOrganizer } from "@/server/event-organizers";

export default async function EventOrganizerPortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getEventOrganizerSession();
  if (!session) redirect("/eo/login");

  return (
    <ToastProvider>
      <DashboardShell
        brand={<Wordmark className="text-sm" />}
        heading={`EO · ${session.organizationName}`}
        nav={[]}
        logoutAction={logoutEventOrganizer}
      >
        {children}
      </DashboardShell>
    </ToastProvider>
  );
}
