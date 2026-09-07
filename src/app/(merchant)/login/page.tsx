import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { LoginMerchantForm } from "@/components/merchant/LoginMerchantForm";
import { getMerchantSession } from "@/lib/auth/session";

export default async function LoginMerchantPage() {
  const session = await getMerchantSession();
  if (session) redirect("/dashboard");

  return (
    <AuthShell
      title="Masuk Pedagang"
      subtitle={
        <>
          Belum punya Lapak?{" "}
          <Link href="/daftar" className="font-semibold text-brand-strong">
            Daftar di sini
          </Link>
        </>
      }
    >
      <LoginMerchantForm />
    </AuthShell>
  );
}
