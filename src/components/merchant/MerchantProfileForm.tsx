"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { Coordinates } from "@/lib/utils/geo";
import { reverseGeocodeAddress } from "@/server/geocoding";
import { updateMerchantProfile } from "@/server/merchants";
import type { MerchantProfileView } from "@/types/merchant";

// Leaflet butuh `window` -- wajib dimatikan SSR-nya di Next.js App Router.
const LocationMapPicker = dynamic(
  () => import("./LocationMapPicker").then((mod) => mod.LocationMapPicker),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full animate-pulse rounded-xl bg-brand-tint" />
    ),
  },
);

export function MerchantProfileForm({
  profile,
}: {
  profile: MerchantProfileView;
}) {
  const router = useRouter();
  const [stallName, setStallName] = useState(profile.stallName);
  const [ownerName, setOwnerName] = useState(profile.ownerName);
  const [category, setCategory] = useState(profile.category);
  const [payoutAccountInfo, setPayoutAccountInfo] = useState(
    profile.payoutAccountInfo ?? "",
  );
  const [address, setAddress] = useState(profile.address ?? "");
  const [location, setLocation] = useState<Coordinates | null>(
    profile.latitude != null && profile.longitude != null
      ? { latitude: profile.latitude, longitude: profile.longitude }
      : null,
  );
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /**
   * Sinkronkan alamat teks ke titik pin -- begitu Pedagang taruh/geser pin,
   * alamat otomatis terisi lewat reverse-geocode (tetap bisa diedit manual
   * sesudahnya). "Hapus lokasi" (coords null) SENGAJA tidak ikut mengosongkan
   * alamat -- teksnya mungkin sudah diedit manual oleh Pedagang.
   */
  async function handleLocationChange(coords: Coordinates | null) {
    setLocation(coords);
    if (!coords) return;
    setGeocoding(true);
    const result = await reverseGeocodeAddress(
      coords.latitude,
      coords.longitude,
    );
    if (result) setAddress(result);
    setGeocoding(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const result = await updateMerchantProfile({
      stallName,
      ownerName,
      category,
      payoutAccountInfo: payoutAccountInfo || undefined,
      address: address || undefined,
      latitude: location?.latitude ?? null,
      longitude: location?.longitude ?? null,
    });

    if (!result.ok) {
      setError(result.message ?? "Gagal menyimpan profil.");
      setSubmitting(false);
      return;
    }
    setMessage(result.message ?? "Profil diperbarui.");
    setSubmitting(false);
    router.refresh();
  }

  return (
    <Card as="form" onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Nama Lapak">
        <Input
          value={stallName}
          onChange={(e) => setStallName(e.target.value)}
          required
          maxLength={100}
        />
      </Field>
      <Field label="Nama Pemilik">
        <Input
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          required
          maxLength={100}
        />
      </Field>
      <Field label="Kategori" hint="mis. Makanan, Minuman, Pakaian">
        <Input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
          maxLength={50}
        />
      </Field>
      {/* Bukan <Field> (selalu render <label>) -- di dalamnya ada peta + dua
          tombol sekaligus, jadi <label> akan salah kaprah "melabeli"
          tombol-tombol itu dengan nama aksesibilitas gabungan seluruh field. */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-ink">
          Lokasi Lapak (GPS)
        </span>
        <LocationMapPicker value={location} onChange={handleLocationChange} />
        <span className="text-xs text-ink-muted">
          Taruh/geser pin ke lokasi Lapak -- alamat di bawah otomatis
          terisi. Opsional.
        </span>
      </div>
      <Field
        label="Alamat Lapak (opsional)"
        hint={
          geocoding
            ? "Mengambil nama alamat dari peta..."
            : "Otomatis terisi dari pin di atas -- bisa diedit manual, mis. tambah patokan."
        }
      >
        <Textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          maxLength={200}
          placeholder="mis. Jl. Merdeka No. 5, dekat Alfamart"
        />
      </Field>
      <Field
        label="Info Rekening / E-wallet Pencairan"
        hint="Ke mana Admin mengirim uang saat pencairan. Opsional."
      >
        <Textarea
          value={payoutAccountInfo}
          onChange={(e) => setPayoutAccountInfo(e.target.value)}
          maxLength={300}
          placeholder="mis. BCA 1234567890 a.n. Budi — atau GoPay 0812xxxxxxx"
        />
      </Field>
      <Field label="Nomor HP (untuk login)" hint="Belum bisa diubah dari sini.">
        <Input value={profile.phone} disabled />
      </Field>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}
      <Button type="submit" fullWidth loading={submitting}>
        {submitting ? "Menyimpan..." : "Simpan Profil"}
      </Button>
    </Card>
  );
}
