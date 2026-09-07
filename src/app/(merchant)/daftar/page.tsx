import { AuthShell } from "@/components/AuthShell";
import { RegisterMerchantForm } from "@/components/merchant/RegisterMerchantForm";

export default function RegisterMerchantPage() {
  return (
    <AuthShell
      title="Daftar Lapak"
      subtitle="Isi data Lapak kamu. Setelah daftar, tunggu approval Admin sebelum bisa login."
    >
      <RegisterMerchantForm />
    </AuthShell>
  );
}
