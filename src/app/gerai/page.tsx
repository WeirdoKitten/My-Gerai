import { MerchantShowcase } from "@/components/buyer/MerchantShowcase";
import { BackgroundPattern } from "@/components/landing/BackgroundPattern";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { StoreIcon } from "@/components/ui/icons";
import { listAllApprovedMerchants } from "@/server/merchants";

// Tanpa ini halaman akan di-static-generate sekali saat build — daftar Lapak
// (approval baru) dan status buka/tutup (dihitung dari jam saat ini) jadi
// beku selamanya sampai deploy berikutnya. Sama seperti landing `/`.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Semua Gerai — MyGerai",
};

export default async function GeraiPage() {
  const merchants = await listAllApprovedMerchants();

  return (
    <>
      <BackgroundPattern />
      <SiteHeader />

      <main className="flex flex-1 flex-col">
        <section className="w-full">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-ink lg:text-5xl">
                Semua Gerai
              </h1>
              <p className="mt-4 text-base text-ink-muted lg:text-lg">
                Pesan dan bayar dulu dari sini, nanti tinggal datang ambil
                pesanannya di gerai. Tidak perlu antre di tempat.
              </p>
            </div>

            {merchants.length > 0 ? (
              <MerchantShowcase merchants={merchants} searchable paginate />
            ) : (
              <EmptyState
                icon={<StoreIcon className="size-10" />}
                title="Belum ada Gerai yang tampil"
                description="Lapak yang sudah disetujui Admin akan muncul di sini."
              />
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
