import Image from "next/image";
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
    <div className="flex gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      {product.photoUrl ? (
        <Image
          src={product.photoUrl}
          alt={product.name}
          width={72}
          height={72}
          className="h-[72px] w-[72px] shrink-0 rounded-md object-cover"
        />
      ) : (
        <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-md bg-zinc-100 text-center text-xs text-zinc-400 dark:bg-zinc-800">
          Tanpa foto
        </div>
      )}
      <div className="flex flex-1 flex-col gap-1">
        <p className="font-medium text-zinc-900 dark:text-zinc-50">
          {product.name}
        </p>
        {product.description ? (
          <p className="line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
            {product.description}
          </p>
        ) : null}
        <p className="font-semibold text-zinc-900 dark:text-zinc-50">
          {formatRupiah(product.price)}
        </p>
        <AddToCartControls product={product} stallSlug={stallSlug} />
      </div>
    </div>
  );
}
