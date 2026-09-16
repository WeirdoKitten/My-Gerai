"use client";

import { useState } from "react";
import { buttonClasses } from "@/components/ui/Button";
import { REGISTRATION_QR_POSTER_SIZE } from "@/lib/utils/registration-qr";

// Render 3x lipat ukuran asli supaya tetap tajam waktu dicetak besar.
const EXPORT_SCALE = 3;

/**
 * Poster QR di-generate server-side sebagai SVG (lihat registration-qr.ts).
 * Tombol ini merasterisasi SVG itu jadi PNG di browser lewat <canvas> — tanpa
 * dependency image-processing baru di server (mis. sharp), karena ini murni
 * kebutuhan sekali unduh, bukan sesuatu yang perlu diproses saat build/start.
 */
export function DownloadQrPosterButton({ svgDataUrl }: { svgDataUrl: string }) {
  const [isPreparing, setIsPreparing] = useState(false);

  async function handleDownload() {
    setIsPreparing(true);
    try {
      const image = new Image();
      image.src = svgDataUrl;
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Gagal memuat gambar QR"));
      });

      const canvas = document.createElement("canvas");
      canvas.width = REGISTRATION_QR_POSTER_SIZE.width * EXPORT_SCALE;
      canvas.height = REGISTRATION_QR_POSTER_SIZE.height * EXPORT_SCALE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = "qr-daftar-pedagang.png";
      link.click();
    } catch (error) {
      console.error("[DownloadQrPosterButton] gagal ekspor PNG", error);
    } finally {
      setIsPreparing(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={isPreparing}
      className={buttonClasses({
        variant: "primary",
        size: "md",
        fullWidth: true,
      })}
    >
      {isPreparing ? "Menyiapkan..." : "Unduh QR Pendaftaran"}
    </button>
  );
}
