"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Reveal } from "@/components/landing/Reveal";
import { TiltCard } from "@/components/landing/TiltCard";
import { ChevronDownIcon, StoreIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";
import type { PublicMerchantListItem } from "@/types/merchant";

type AreaFilter = "all" | "none" | string;

type AreaChip = { id: string; name: string; count: number };

export function MerchantShowcase({
  merchants,
}: {
  merchants: PublicMerchantListItem[];
}) {
  const [selectedArea, setSelectedArea] = useState<AreaFilter>("all");

  // Chip cuma muncul kalau Admin sudah bikin minimal 1 Area (lihat
  // /admin/areas) dan minimal 1 Lapak match ke area itu -- kalau belum ada
  // area sama sekali, landing page tampil grid polos seperti sebelumnya.
  const { areaChips, unassignedCount } = useMemo(() => {
    const byArea = new Map<string, AreaChip>();
    let unassigned = 0;
    for (const merchant of merchants) {
      if (merchant.areaId && merchant.areaName) {
        const existing = byArea.get(merchant.areaId);
        if (existing) existing.count += 1;
        else
          byArea.set(merchant.areaId, {
            id: merchant.areaId,
            name: merchant.areaName,
            count: 1,
          });
      } else {
        unassigned += 1;
      }
    }
    return {
      areaChips: Array.from(byArea.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
      unassignedCount: unassigned,
    };
  }, [merchants]);

  const visibleMerchants = useMemo(() => {
    if (selectedArea === "all") return merchants;
    if (selectedArea === "none")
      return merchants.filter((merchant) => !merchant.areaId);
    return merchants.filter((merchant) => merchant.areaId === selectedArea);
  }, [merchants, selectedArea]);

  return (
    <div className="mt-16">
      {areaChips.length > 0 ? (
        <div className="mb-6 flex flex-wrap items-center justify-center gap-1.5">
          <AreaChipButton
            label={`Semua (${merchants.length})`}
            active={selectedArea === "all"}
            onClick={() => setSelectedArea("all")}
          />
          {areaChips.map((area) => (
            <AreaChipButton
              key={area.id}
              label={`${area.name} (${area.count})`}
              active={selectedArea === area.id}
              onClick={() => setSelectedArea(area.id)}
            />
          ))}
          {unassignedCount > 0 ? (
            <AreaChipButton
              label={`Lainnya (${unassignedCount})`}
              active={selectedArea === "none"}
              onClick={() => setSelectedArea("none")}
            />
          ) : null}
        </div>
      ) : null}

      {visibleMerchants.length === 0 ? (
        <p className="text-center text-sm text-ink-muted">
          Tidak ada Lapak di area ini.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibleMerchants.map((merchant, index) => (
            <Reveal key={merchant.slug} delay={index * 0.08}>
              <Link href={`/menu/${merchant.slug}`} className="block h-full">
                <TiltCard
                  pad="none"
                  elevated
                  className="group flex h-full flex-col overflow-hidden"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-brand-tint">
                    {merchant.photoUrl ? (
                      <Image
                        src={merchant.photoUrl}
                        alt={merchant.stallName}
                        fill
                        sizes="(min-width: 1024px) 360px, (min-width: 640px) 45vw, 90vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-gradient-to-br from-brand-tint via-brand-tint to-brand/10">
                        <StoreIcon className="size-16 text-brand/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <p className="line-clamp-2 text-xl font-bold leading-tight text-white">
                        {merchant.stallName}
                      </p>
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <p className="truncate text-sm text-white/80">
                          {merchant.category}
                          {merchant.areaName ? ` · ${merchant.areaName}` : ""}
                        </p>
                        <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-white/90">
                          Lihat Menu
                          <ChevronDownIcon className="size-3.5 -rotate-90" />
                        </span>
                      </div>
                    </div>
                  </div>
                </TiltCard>
              </Link>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}

function AreaChipButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
        active
          ? "bg-brand-strong text-white"
          : "bg-brand-tint text-brand-strong hover:bg-brand-tint/70",
      )}
    >
      {label}
    </button>
  );
}
