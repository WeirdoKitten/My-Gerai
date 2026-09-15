"use client";

import { VolumeIcon } from "@/components/ui/icons";
import { Toggle } from "@/components/ui/Toggle";
import { useSound } from "@/lib/sound/sound-context";

/** Row Profil untuk mute/unmute notifikasi suara Pesanan masuk (lihat SoundProvider). */
export function SoundSettingRow() {
  const { enabled, toggle } = useSound();

  return (
    <div className="flex items-center justify-between rounded-card border border-line bg-surface px-4 py-3.5 text-sm font-semibold text-ink">
      <span className="flex items-center gap-2">
        <VolumeIcon className="size-4 text-ink-muted" />
        Notifikasi Suara Pesanan
      </span>
      <Toggle
        checked={enabled}
        onChange={toggle}
        label={
          enabled
            ? "Matikan notifikasi suara Pesanan"
            : "Nyalakan notifikasi suara Pesanan"
        }
      />
    </div>
  );
}
