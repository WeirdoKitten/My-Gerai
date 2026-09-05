import { notFound } from "next/navigation";
import { FloatingCartBar } from "@/components/buyer/FloatingCartBar";
import { ProductCard } from "@/components/buyer/ProductCard";
import { getStallCatalog } from "@/server/products";

export default async function StallMenuPage(
  props: PageProps<"/menu/[stallSlug]">,
) {
  const { stallSlug } = await props.params;
  const catalog = await getStallCatalog(stallSlug);

  if (!catalog) notFound();

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {catalog.merchant.stallName}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {catalog.merchant.category}
        </p>
      </div>
      {catalog.products.length === 0 ? (
        <p className="text-zinc-500 dark:text-zinc-400">
          Belum ada Item tersedia.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
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
