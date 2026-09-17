"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Reveal } from "@/components/landing/Reveal";
import { TiltCard } from "@/components/landing/TiltCard";
import { Button } from "@/components/ui/Button";
import { ChevronDownIcon, StoreIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";
import {
  type Coordinates,
  formatDistanceKm,
  haversineDistanceKm,
} from "@/lib/utils/geo";
import type { PublicMerchantListItem } from "@/types/merchant";

type RadiusFilter = "all" | 1 | 3 | 5;

const RADIUS_OPTIONS: { label: string; value: RadiusFilter }[] = [
  { label: "Semua", value: "all" },
  { label: "< 1 km", value: 1 },
  { label: "< 3 km", value: 3 },
  { label: "< 5 km", value: 5 },
];

type MerchantWithDistance = PublicMerchantListItem & {
  distanceKm: number | null;
};

export function MerchantShowcase({
  merchants,
}: {
  merchants: PublicMerchantListItem[];
}) {
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [geoState, setGeoState] = useState<
    "idle" | "loading" | "granted" | "denied"
  >("idle");
  const [radiusFilter, setRadiusFilter] = useState<RadiusFilter>("all");

  function handleSortByDistance() {
    if (!navigator.geolocation) {
      setGeoState("denied");
      return;
    }
    setGeoState("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setGeoState("granted");
      },
      () => setGeoState("denied"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  // Lapak tanpa koordinat tetap tampil, cuma dideprioritaskan ke akhir list
  // (bukan disembunyikan) -- lihat Fase 8 di BACKLOG.md.
  const sortedMerchants = useMemo<MerchantWithDistance[]>(() => {
    if (!userCoords) return merchants.map((m) => ({ ...m, distanceKm: null }));

    const withDistance: MerchantWithDistance[] = merchants.map((m) => ({
      ...m,
      distanceKm:
        m.latitude != null && m.longitude != null
          ? haversineDistanceKm(userCoords, {
              latitude: m.latitude,
              longitude: m.longitude,
            })
          : null,
    }));

    const located = withDistance
      .filter((m) => m.distanceKm != null)
      .sort((a, b) => (a.distanceKm as number) - (b.distanceKm as number));
    const unlocated = withDistance.filter((m) => m.distanceKm == null);
    return [...located, ...unlocated];
  }, [merchants, userCoords]);

  const visibleMerchants = useMemo(() => {
    if (radiusFilter === "all" || !userCoords) return sortedMerchants;
    return sortedMerchants.filter(
      (m) => m.distanceKm != null && m.distanceKm <= radiusFilter,
    );
  }, [sortedMerchants, radiusFilter, userCoords]);

  return (
    <div className="mt-16">
      <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={geoState === "loading"}
          onClick={handleSortByDistance}
        >
          Urutkan berdasarkan jarak terdekat
        </Button>
        {geoState === "granted" ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {RADIUS_OPTIONS.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => setRadiusFilter(option.value)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                  radiusFilter === option.value
                    ? "bg-brand-strong text-white"
                    : "bg-brand-tint text-brand-strong hover:bg-brand-tint/70",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
        {geoState === "denied" ? (
          <span className="text-xs text-ink-muted">
            Tidak bisa akses lokasi — menampilkan urutan biasa.
          </span>
        ) : null}
      </div>

      {visibleMerchants.length === 0 ? (
        <p className="text-center text-sm text-ink-muted">
          Tidak ada Lapak dalam radius ini.
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
                          {merchant.distanceKm != null
                            ? ` · ${formatDistanceKm(merchant.distanceKm)}`
                            : ""}
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
