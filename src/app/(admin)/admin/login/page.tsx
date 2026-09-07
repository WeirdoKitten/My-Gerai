import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { LoginAdminForm } from "@/components/admin/LoginAdminForm";
import { getAdminSession } from "@/lib/auth/admin-session";

export default async function LoginAdminPage() {
  const session = await getAdminSession();
  if (session) redirect("/admin/merchants");

  return (
    <AuthShell title="Masuk Admin" subtitle="Panel internal Aplikator.">
      <LoginAdminForm />
    </AuthShell>
  );
}
