import { RegisterMerchantForm } from "@/components/merchant/RegisterMerchantForm";

export default function RegisterMerchantPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Daftar Lapak
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Isi data Lapak kamu. Setelah daftar, tunggu approval Admin sebelum
          bisa login.
        </p>
      </div>
      <RegisterMerchantForm />
    </div>
  );
}
