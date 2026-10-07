import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { LoginEventOrganizerForm } from "@/components/eo/LoginEventOrganizerForm";
import { getEventOrganizerSession } from "@/lib/auth/eo-session";

export default async function LoginEventOrganizerPage() {
  const session = await getEventOrganizerSession();
  if (session) redirect("/eo");

  return (
    <AuthShell
      title="Masuk Event Organizer"
      subtitle={
        <>
          Belum punya akun EO?{" "}
          <Link href="/eo/daftar" className="font-semibold text-brand-strong">
            Daftar di sini
          </Link>
        </>
      }
    >
      <LoginEventOrganizerForm />
    </AuthShell>
  );
}
