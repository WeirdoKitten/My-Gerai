"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { PhotoThumb } from "@/components/ui/PhotoThumb";
import { Textarea } from "@/components/ui/Textarea";
import { resizeImage } from "@/lib/upload/resize-image";
import type { Coordinates } from "@/lib/utils/geo";
import { reverseGeocodeAddress } from "@/server/geocoding";
import { updateMerchantProfile, uploadMerchantPhoto } from "@/server/merchants";
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
  const [photoUrl, setPhotoUrl] = useState<string | null>(
    profile.photoUrl ?? null,
  );
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadingPhoto(true);
    setPhotoError(null);
    try {
      const resized = await resizeImage(file);
      const formData = new FormData();
      formData.append("file", resized, "foto.jpg");
      const result = await uploadMerchantPhoto(formData);
      if (!result.ok) {
        setPhotoError(result.message);
        return;
      }
      setPhotoUrl(result.url);
    } catch {
      setPhotoError("Gagal memproses foto. Coba foto lain.");
    } finally {
      setUploadingPhoto(false);
    }
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
      photoUrl,
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
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-ink">
          Foto Sampul Lapak (opsional)
        </span>
        <div className="flex items-center gap-3">
          <PhotoThumb src={photoUrl} alt="Pratinjau foto Lapak" />
          <div className="flex flex-col gap-1.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={uploadingPhoto}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadingPhoto
                ? "Mengunggah..."
                : photoUrl
                  ? "Ganti Foto"
                  : "Tambah Foto"}
            </Button>
            {photoUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPhotoUrl(null)}
              >
                Hapus Foto
              </Button>
            ) : null}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handlePhotoChange}
        />
        <span className="text-xs text-ink-muted">
          Tampil di kartu Gerai (landing & "Semua Gerai") -- belum ada foto =
          tampil ikon toko polos.
        </span>
        {photoError ? <Alert tone="error">{photoError}</Alert> : null}
      </div>
      {/* Bukan <Field> (selalu render <label>) -- di dalamnya ada peta + dua
          tombol sekaligus, jadi <label> akan salah kaprah "melabeli"
          tombol-tombol itu dengan nama aksesibilitas gabungan seluruh field. */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-ink">
          Lokasi Lapak (GPS)
        </span>
        <LocationMapPicker value={location} onChange={handleLocationChange} />
        <span className="text-xs text-ink-muted">
          Taruh/geser pin ke lokasi Lapak -- alamat di bawah otomatis terisi.
          Opsional.
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
      <Button
        type="submit"
        fullWidth
        loading={submitting}
        disabled={uploadingPhoto}
      >
        {submitting ? "Menyimpan..." : "Simpan Profil"}
      </Button>
    </Card>
  );
}
