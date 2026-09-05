import { redirect } from "next/navigation";
import { LoginMerchantForm } from "@/components/merchant/LoginMerchantForm";
import { getMerchantSession } from "@/lib/auth/session";

export default async function LoginMerchantPage() {
  const session = await getMerchantSession();
  if (session) redirect("/dashboard");

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Masuk Pedagang
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Belum punya Lapak?{" "}
          <a href="/daftar" className="underline">
            Daftar di sini
          </a>
          .
        </p>
      </div>
      <LoginMerchantForm />
    </div>
  );
}
