import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getMerchantSession } from "@/lib/auth/session";
import { logoutMerchant } from "@/server/merchants";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getMerchantSession();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div>
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">
            {session.stallName}
          </p>
          <nav className="mt-1 flex gap-3 text-sm">
            <a
              href="/dashboard"
              className="text-zinc-500 hover:underline dark:text-zinc-400"
            >
              Pesanan
            </a>
            <a
              href="/dashboard/produk"
              className="text-zinc-500 hover:underline dark:text-zinc-400"
            >
              Item
            </a>
          </nav>
        </div>
        <form action={logoutMerchant}>
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
