import { PlatformConfigForm } from "@/components/admin/PlatformConfigForm";
import { PlatformConfigHistoryList } from "@/components/admin/PlatformConfigHistoryList";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  getActivePlatformConfig,
  getPlatformConfigHistory,
} from "@/server/config";

export default async function AdminConfigPage() {
  const [current, history] = await Promise.all([
    getActivePlatformConfig(),
    getPlatformConfigHistory(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <PageHeader title="Konfigurasi Aplikator" />
        <PlatformConfigForm current={current} />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink">Riwayat Perubahan</h2>
        <PlatformConfigHistoryList history={history} />
      </section>
    </div>
  );
}
