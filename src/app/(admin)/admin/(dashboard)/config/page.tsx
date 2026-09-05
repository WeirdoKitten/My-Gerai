import { PlatformConfigForm } from "@/components/admin/PlatformConfigForm";
import { PlatformConfigHistoryList } from "@/components/admin/PlatformConfigHistoryList";
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
      <div>
        <h1 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Konfigurasi Aplikator
        </h1>
        <PlatformConfigForm current={current} />
      </div>
      <div>
        <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Riwayat Perubahan
        </h2>
        <PlatformConfigHistoryList history={history} />
      </div>
    </div>
  );
}
