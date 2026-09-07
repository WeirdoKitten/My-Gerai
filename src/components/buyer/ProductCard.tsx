import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { ImageOffIcon } from "@/components/ui/icons";
import { formatRupiah } from "@/lib/utils/money";
import type { BuyerProductView } from "@/types/product";
import { AddToCartControls } from "./AddToCartControls";

export function ProductCard({
  product,
  stallSlug,
}: {
  product: BuyerProductView;
  stallSlug: string;
}) {
  return (
    <Card pad="sm" className="flex gap-3">
      {product.photoUrl ? (
        <Image
          src={product.photoUrl}
          alt={product.name}
          width={80}
          height={80}
          className="size-20 shrink-0 rounded-control object-cover"
        />
      ) : (
        <div className="flex size-20 shrink-0 items-center justify-center rounded-control bg-brand-tint text-brand">
          <ImageOffIcon className="size-6" />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="font-semibold text-ink">{product.name}</p>
        {product.description ? (
          <p className="mt-0.5 line-clamp-2 text-sm text-ink-muted">
            {product.description}
          </p>
        ) : null}
        <p className="mt-1 font-bold tabular-nums text-ink">
          {formatRupiah(product.price)}
        </p>
        <div className="mt-2">
          <AddToCartControls product={product} stallSlug={stallSlug} />
        </div>
      </div>
    </Card>
  );
}
