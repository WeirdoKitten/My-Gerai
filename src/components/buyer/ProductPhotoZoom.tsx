"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { XIcon } from "@/components/ui/icons";
import { PhotoThumb } from "@/components/ui/PhotoThumb";

/**
 * Thumbnail foto Item yang bisa diketuk untuk melihat foto ukuran besar.
 * Foto besar baru diunduh saat dibuka, jadi halaman menu tetap ringan.
 * Item tanpa foto tetap tampil placeholder biasa (tidak bisa diketuk).
 */
export function ProductPhotoZoom({
  src,
  alt,
}: {
  src: string | null;
  alt: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!src) return <PhotoThumb src={null} alt={alt} bordered={false} />;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Perbesar foto ${alt}`}
        className="shrink-0 cursor-zoom-in self-start rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <PhotoThumb src={src} alt={alt} bordered={false} />
      </button>

      {/* biome-ignore lint/a11y/useKeyWithClickEvents: <dialog> menangani Esc untuk keyboard; klik di mana saja hanya kemudahan sentuh/mouse */}
      <dialog
        ref={ref}
        aria-label={`Foto ${alt}`}
        onClose={() => setOpen(false)}
        onClick={() => setOpen(false)}
        className="m-auto max-h-none max-w-none bg-transparent p-0 backdrop:bg-ink/85"
      >
        {open ? (
          <figure className="flex w-[calc(100vw-2rem)] max-w-lg flex-col items-center gap-3">
            <Image
              src={src}
              alt={alt}
              width={1280}
              height={1280}
              sizes="(max-width: 544px) 100vw, 512px"
              className="max-h-[75vh] w-full rounded-card object-contain"
            />
            <figcaption className="text-center font-semibold text-white">
              {alt}
            </figcaption>
          </figure>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Tutup"
          className="fixed top-4 right-4 flex size-10 items-center justify-center rounded-full bg-ink/60 text-white"
        >
          <XIcon className="size-5" />
        </button>
      </dialog>
    </>
  );
}
