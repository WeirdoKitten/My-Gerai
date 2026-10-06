import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatRupiah } from "@/lib/utils/money";
import type { BuyerProductView } from "@/types/product";
import { AddToCartControls } from "./AddToCartControls";
import { ProductPhotoZoom } from "./ProductPhotoZoom";

export function ProductCard({
  product,
  stallSlug,
}: {
  product: BuyerProductView;
  stallSlug: string;
}) {
  return (
    <Card pad="sm" className="flex gap-3">
      <ProductPhotoZoom src={product.photoUrl} alt={product.name} />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="font-semibold text-ink">{product.name}</p>
        {product.preOrder ? (
          <Badge tone="info" className="mt-1 self-start">
            Pre-order · siap min. {product.preOrder.minDays} hari
          </Badge>
        ) : null}
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
