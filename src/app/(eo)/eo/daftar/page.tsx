import { AuthShell } from "@/components/AuthShell";
import { RegisterEventOrganizerForm } from "@/components/eo/RegisterEventOrganizerForm";

export default function RegisterEventOrganizerPage() {
  return (
    <AuthShell
      title="Daftar Event Organizer"
      subtitle="Buat satu QR untuk banyak Gerai di event kamu. Setelah daftar, tunggu persetujuan Admin sebelum bisa login."
    >
      <RegisterEventOrganizerForm />
    </AuthShell>
  );
}
