"use client";

import { useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PhotoThumb } from "@/components/ui/PhotoThumb";
import { resizeImage } from "@/lib/upload/resize-image";
import { uploadEventOrganizerQris } from "@/server/event-organizers";

/**
 * Unggah/ganti foto QRIS "uang jasa titipan" EO. Langsung aktif dan dipakai
 * semua Gerai Titipan EO ini (lihat uploadEventOrganizerQris).
 */
export function EventOrganizerQrisUploader({
  initialUrl,
  onUploaded,
}: {
  initialUrl: string | null;
  onUploaded?: (url: string) => void;
}) {
  const [qrisPhotoUrl, setQrisPhotoUrl] = useState(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const resized = await resizeImage(file);
      const formData = new FormData();
      formData.append("file", resized, "qris.jpg");
      const result = await uploadEventOrganizerQris(formData);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setQrisPhotoUrl(result.url);
      onUploaded?.(result.url);
    } catch {
      setError("Gagal memproses foto. Coba foto lain.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3">
        <PhotoThumb src={qrisPhotoUrl} alt="Pratinjau QRIS uang jasa titipan" />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading
            ? "Mengunggah..."
            : qrisPhotoUrl
              ? "Ganti Foto QRIS"
              : "Unggah Foto QRIS"}
        </Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        aria-label="File foto QRIS"
        onChange={handlePhotoChange}
      />
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}
