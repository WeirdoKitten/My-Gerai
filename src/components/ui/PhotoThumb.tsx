import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import { ImageOffIcon } from "./icons";

/** Foto persegi + fallback placeholder — dipakai kartu/daftar Item & form. */
export function PhotoThumb({
  src,
  alt,
  size = "md",
  bordered = true,
}: {
  src: string | null;
  alt: string;
  size?: "sm" | "md";
  bordered?: boolean;
}) {
  const box = size === "sm" ? "size-12" : "size-20";

  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        width={80}
        height={80}
        className={cn(
          box,
          "shrink-0 rounded-control object-cover",
          bordered && "border border-line",
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        box,
        "flex shrink-0 items-center justify-center rounded-control bg-brand-tint text-brand",
      )}
    >
      <ImageOffIcon className={size === "sm" ? "size-5" : "size-6"} />
    </div>
  );
}
