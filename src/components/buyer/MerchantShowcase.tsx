"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ChevronDownIcon, StoreIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils/cn";
import { formatDistanceKm, haversineDistanceKm } from "@/lib/utils/geo";
import type { PublicMerchantListItem } from "@/types/merchant";

type AreaFilter = "all" | "none" | "nearest" | string;

type AreaChip = { id: string; name: string; count: number };

/** Berapa Area bernama yang tampil langsung sebagai chip (sisanya lewat "Lainnya"). */
const DIRECT_AREA_CHIP_LIMIT = 3;

export function MerchantShowcase({
  merchants,
  mobileLimit,
  desktopLimit,
}: {
  merchants: PublicMerchantListItem[];
  /** Batasi jumlah kartu yang TAMPIL (bukan yang dikirim) di bawah breakpoint `lg` — dipakai landing supaya tidak padat. Kosongkan untuk tampilkan semua (`/gerai`). */
  mobileLimit?: number;
  /** Batasi jumlah kartu yang tampil di breakpoint `lg` ke atas. */
  desktopLimit?: number;
}) {
  const [selectedArea, setSelectedArea] = useState<AreaFilter>("all");
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [areaModalOpen, setAreaModalOpen] = useState(false);

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

  const directAreaChips = useMemo(
    () =>
      [...areaChips]
        .sort((a, b) => b.count - a.count)
        .slice(0, DIRECT_AREA_CHIP_LIMIT),
    [areaChips],
  );
  const hasOverflowAreas = areaChips.length > DIRECT_AREA_CHIP_LIMIT;
  const showMoreButton = hasOverflowAreas || unassignedCount > 0;
  const isMoreActive =
    selectedArea !== "all" &&
    selectedArea !== "nearest" &&
    !directAreaChips.some((area) => area.id === selectedArea);

  const hasAnyCoordinates = useMemo(
    () => merchants.some((m) => m.latitude != null && m.longitude != null),
    [merchants],
  );

  const { visibleMerchants, distanceBySlug } = useMemo(() => {
    if (selectedArea === "nearest" && userLocation) {
      const withDistance = merchants
        .filter((m) => m.latitude != null && m.longitude != null)
        .map((m) => ({
          merchant: m,
          distanceKm: haversineDistanceKm(userLocation, {
            latitude: m.latitude as number,
            longitude: m.longitude as number,
          }),
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm);
      return {
        visibleMerchants: withDistance.map((w) => w.merchant),
        distanceBySlug: new Map(
          withDistance.map((w) => [w.merchant.slug, w.distanceKm]),
        ),
      };
    }
    const filtered =
      selectedArea === "all"
        ? merchants
        : selectedArea === "none"
          ? merchants.filter((merchant) => !merchant.areaId)
          : selectedArea === "nearest"
            ? [] // lokasi belum didapat -- tunggu izin/hasil geolocation
            : merchants.filter((merchant) => merchant.areaId === selectedArea);
    return { visibleMerchants: filtered, distanceBySlug: null };
  }, [merchants, selectedArea, userLocation]);

  function handleNearestClick() {
    if (userLocation) {
      setSelectedArea("nearest");
      return;
    }
    if (!navigator.geolocation) {
      setLocationError("Perangkat/browser ini tidak mendukung lokasi.");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setSelectedArea("nearest");
        setLocating(false);
      },
      () => {
        setLocationError(
          "Gagal mengambil lokasi -- izin lokasi mungkin ditolak.",
        );
        setLocating(false);
      },
      { timeout: 10_000 },
    );
  }

  return (
    <div className="mt-16">
      {areaChips.length > 0 || hasAnyCoordinates ? (
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <AreaChipButton
              label={`Semua (${merchants.length})`}
              active={selectedArea === "all"}
              onClick={() => setSelectedArea("all")}
            />
            {hasAnyCoordinates ? (
              <AreaChipButton
                label={locating ? "Mencari lokasi..." : "Terdekat"}
                active={selectedArea === "nearest"}
                disabled={locating}
                onClick={handleNearestClick}
              />
            ) : null}
            {directAreaChips.map((area) => (
              <AreaChipButton
                key={area.id}
                label={`${area.name} (${area.count})`}
                active={selectedArea === area.id}
                onClick={() => setSelectedArea(area.id)}
              />
            ))}
            {showMoreButton ? (
              <AreaChipButton
                label="Lainnya"
                active={isMoreActive}
                onClick={() => setAreaModalOpen(true)}
              />
            ) : null}
          </div>
          {locationError ? (
            <p className="text-center text-xs text-danger">{locationError}</p>
          ) : null}
        </div>
      ) : null}

      <Modal
        open={areaModalOpen}
        onClose={() => setAreaModalOpen(false)}
        title="Semua Area"
      >
        <div className="flex flex-col gap-2">
          {areaChips.map((area) => (
            <button
              key={area.id}
              type="button"
              onClick={() => {
                setSelectedArea(area.id);
                setAreaModalOpen(false);
              }}
              className={cn(
                "cursor-pointer rounded-control border px-3.5 py-2.5 text-left text-sm font-semibold transition-colors",
                selectedArea === area.id
                  ? "border-brand-strong bg-brand-tint text-brand-strong"
                  : "border-line text-ink hover:bg-bg",
              )}
            >
              {area.name} ({area.count})
            </button>
          ))}
          {unassignedCount > 0 ? (
            <button
              type="button"
              onClick={() => {
                setSelectedArea("none");
                setAreaModalOpen(false);
              }}
              className={cn(
                "cursor-pointer rounded-control border px-3.5 py-2.5 text-left text-sm font-semibold transition-colors",
                selectedArea === "none"
                  ? "border-brand-strong bg-brand-tint text-brand-strong"
                  : "border-line text-ink hover:bg-bg",
              )}
            >
              Tanpa Area ({unassignedCount})
            </button>
          ) : null}
        </div>
      </Modal>

      {visibleMerchants.length === 0 ? (
        <p className="text-center text-sm text-ink-muted">
          {selectedArea === "nearest" && !userLocation
            ? "Menunggu izin lokasi..."
            : "Tidak ada Lapak di area ini."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibleMerchants.map((merchant, index) => (
            <Link
              key={merchant.slug}
              href={`/menu/${merchant.slug}`}
              className={cn(
                "h-full",
                desktopLimit !== undefined && index >= desktopLimit
                  ? "hidden"
                  : mobileLimit !== undefined && index >= mobileLimit
                    ? "hidden lg:block"
                    : "block",
              )}
            >
              <Card
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
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center bg-gradient-to-br from-brand-tint via-brand-tint to-brand/10">
                      <StoreIcon className="size-16 text-brand/50" />
                    </div>
                  )}
                  <div className="absolute right-3 top-3">
                    <Badge tone={merchant.isOpen ? "success" : "neutral"}>
                      {merchant.isOpen ? "Buka" : "Tutup"}
                    </Badge>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <p className="line-clamp-2 text-xl font-bold leading-tight text-white">
                      {merchant.stallName}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <p className="truncate text-sm text-white/80">
                        {merchant.category}
                        {distanceBySlug?.has(merchant.slug)
                          ? ` · ${formatDistanceKm(distanceBySlug.get(merchant.slug) as number)}`
                          : merchant.areaName
                            ? ` · ${merchant.areaName}`
                            : ""}
                      </p>
                      <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-white/90">
                        Lihat Menu
                        <ChevronDownIcon className="size-3.5 -rotate-90" />
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AreaChipButton({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        active
          ? "border-brand-strong bg-brand-strong text-white hover:border-[#9A3412] hover:bg-[#9A3412]"
          : "border-line bg-surface text-ink-muted hover:border-brand-strong hover:bg-brand-tint hover:text-brand-strong",
      )}
    >
      {label}
    </button>
  );
}
