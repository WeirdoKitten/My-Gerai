import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getAdminSession } from "@/lib/auth/admin-session";
import { logoutAdmin } from "@/server/admins";

export default async function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div>
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">
            {session.name}
          </p>
          <nav className="mt-1 flex gap-3 text-sm">
            <a
              href="/admin/merchants"
              className="text-zinc-500 hover:underline dark:text-zinc-400"
            >
              Pedagang
            </a>
            <a
              href="/admin/config"
              className="text-zinc-500 hover:underline dark:text-zinc-400"
            >
              Konfigurasi
            </a>
            <a
              href="/admin/payouts"
              className="text-zinc-500 hover:underline dark:text-zinc-400"
            >
              Pencairan
            </a>
          </nav>
        </div>
        <form action={logoutAdmin}>
          <button
            type="submit"
            className="text-sm text-zinc-500 underline dark:text-zinc-400"
          >
            Keluar
          </button>
        </form>
      </header>
      {children}
    </div>
  );
}
