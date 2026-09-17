import { ServiceAreaManagerForm } from "@/components/admin/ServiceAreaManagerForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { listServiceAreas } from "@/server/service-areas";

export default async function AdminAreasPage() {
  const areas = await listServiceAreas();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Area Lapak"
        subtitle="Kelompokkan Lapak secara otomatis berdasarkan jarak dari titik pusat area. Lapak yang koordinatnya masuk radius suatu area akan tampil di bawah nama area itu di landing page."
      />
      <ServiceAreaManagerForm initialAreas={areas} />
    </div>
  );
}
