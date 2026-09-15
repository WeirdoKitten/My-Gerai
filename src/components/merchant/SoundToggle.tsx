"use client";

import { HEADER_ICON_CLASS } from "@/components/merchant/header-icon-class";
import { VolumeIcon, VolumeOffIcon } from "@/components/ui/icons";
import { useSound } from "@/lib/sound/sound-context";

/** Ikon header untuk mute/unmute notifikasi suara Pesanan masuk (lihat SoundProvider). */
export function SoundToggle() {
  const { enabled, toggle } = useSound();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        enabled ? "Matikan notifikasi suara Pesanan" : "Nyalakan notifikasi suara Pesanan"
      }
      aria-pressed={enabled}
      className={HEADER_ICON_CLASS}
    >
      {enabled ? (
        <VolumeIcon className="size-4" />
      ) : (
        <VolumeOffIcon className="size-4" />
      )}
    </button>
  );
}
