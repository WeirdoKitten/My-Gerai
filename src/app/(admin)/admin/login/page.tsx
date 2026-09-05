import { redirect } from "next/navigation";
import { LoginAdminForm } from "@/components/admin/LoginAdminForm";
import { getAdminSession } from "@/lib/auth/admin-session";

export default async function LoginAdminPage() {
  const session = await getAdminSession();
  if (session) redirect("/admin/merchants");

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Masuk Admin
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Panel internal Aplikator.
        </p>
      </div>
      <LoginAdminForm />
    </div>
  );
}
