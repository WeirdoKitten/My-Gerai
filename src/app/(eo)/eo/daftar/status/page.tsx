import { AuthShell } from "@/components/AuthShell";
import { ButtonLink } from "@/components/ui/ButtonLink";

export default function RegisterEventOrganizerStatusPage() {
  return (
    <AuthShell
      title="Pendaftaran Diterima"
      subtitle="Akun EO kamu sedang ditinjau Admin."
    >
      <div className="flex flex-col gap-4 text-center">
        <p className="text-sm text-ink-muted">
          Kamu akan bisa login dan mulai membuat event begitu pendaftaran
          disetujui Admin. Coba login lagi nanti untuk mengecek status terbaru.
        </p>
        <ButtonLink href="/eo/login" fullWidth>
          Coba Masuk
        </ButtonLink>
      </div>
    </AuthShell>
  );
}
