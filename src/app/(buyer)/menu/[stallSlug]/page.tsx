import { notFound } from "next/navigation";
import { FloatingCartBar } from "@/components/buyer/FloatingCartBar";
import { ProductCard } from "@/components/buyer/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ImageOffIcon, StoreIcon } from "@/components/ui/icons";
import { getStallCatalog } from "@/server/products";

export default async function StallMenuPage(
  props: PageProps<"/menu/[stallSlug]">,
) {
  const { stallSlug } = await props.params;
  const catalog = await getStallCatalog(stallSlug);

  if (!catalog) notFound();

  return (
    <div className="flex flex-col gap-4 pb-28">
      <div className="flex items-start gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-card bg-brand-tint text-brand">
          <StoreIcon className="size-6" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-ink">
            {catalog.merchant.stallName}
          </h1>
          <p className="text-sm text-ink-muted">{catalog.merchant.category}</p>
        </div>
      </div>

      {catalog.products.length === 0 ? (
        <EmptyState
          icon={<ImageOffIcon className="size-10" />}
          title="Belum ada Item"
          description="Lapak ini belum menambahkan menu apa pun."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {catalog.products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              stallSlug={catalog.merchant.slug}
            />
          ))}
        </div>
      )}

      <FloatingCartBar />
    </div>
  );
}
