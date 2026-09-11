"use client";

import { useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PhotoThumb } from "@/components/ui/PhotoThumb";
import { resizeImage } from "@/lib/upload/resize-image";
import { uploadQrisPhoto } from "@/server/merchants";
import type { MerchantPaymentSettingsView } from "@/types/merchant";

const PAYMENT_MODE_LABEL: Record<
  MerchantPaymentSettingsView["paymentMode"],
  string
> = {
  gateway: "Payment Gateway (Midtrans)",
  qris_pribadi: "QRIS Pribadi",
};

/**
 * Ganti metode pembayaran HANYA lewat Admin (keputusan User) — di sini
 * Pedagang cuma bisa lihat mode saat ini (read-only) & unggah/ganti foto
 * QRIS pribadi miliknya, sebagai prasyarat sebelum Admin mengaktifkan mode
 * `qris_pribadi` (lihat setMerchantPaymentMode).
 */
export function PaymentModeSection({
  settings,
}: {
  settings: MerchantPaymentSettingsView;
}) {
  const [qrisPhotoUrl, setQrisPhotoUrl] = useState(settings.qrisPhotoUrl);
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
      const result = await uploadQrisPhoto(formData);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setQrisPhotoUrl(result.url);
    } catch {
      setError("Gagal memproses foto. Coba foto lain.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-ink-muted">Metode saat ini</p>
        <p className="font-semibold text-ink">
          {PAYMENT_MODE_LABEL[settings.paymentMode]}
        </p>
      </div>
      <p className="text-xs text-ink-muted">
        Hanya Admin yang bisa mengubah metode pembayaran Lapak. Kalau kamu ingin
        beralih ke QRIS pribadi, unggah foto QRIS di bawah ini lalu hubungi
        Admin.
      </p>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-ink">QRIS Pribadi</span>
        <div className="flex items-center gap-3">
          <PhotoThumb src={qrisPhotoUrl} alt="Pratinjau QRIS pribadi" />
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
          onChange={handlePhotoChange}
        />
        {error ? <Alert tone="error">{error}</Alert> : null}
      </div>
    </Card>
  );
}
