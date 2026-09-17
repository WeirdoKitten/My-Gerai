import { AuthShell } from "@/components/AuthShell";
import { ButtonLink } from "@/components/ui/ButtonLink";

export default function RegisterMerchantStatusPage() {
  return (
    <AuthShell
      title="Pendaftaran Diterima"
      subtitle="Lapak kamu sedang ditinjau Admin."
    >
      <div className="flex flex-col gap-4 text-center">
        <p className="text-sm text-ink-muted">
          Kamu akan bisa login dan mulai kelola Lapak begitu pendaftaran
          disetujui Admin. Coba login lagi nanti untuk mengecek status terbaru.
        </p>
        <ButtonLink href="/login" fullWidth>
          Coba Masuk
        </ButtonLink>
      </div>
    </AuthShell>
  );
}
