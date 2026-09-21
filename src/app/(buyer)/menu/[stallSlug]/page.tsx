import { notFound } from "next/navigation";
import { ClosedStallNotice } from "@/components/buyer/ClosedStallNotice";
import { FloatingCartBar } from "@/components/buyer/FloatingCartBar";
import { ProductCard } from "@/components/buyer/ProductCard";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  HistoryIcon,
  ImageOffIcon,
  MapPinIcon,
  StoreIcon,
} from "@/components/ui/icons";
import { getStallCatalog } from "@/server/products";

export default async function StallMenuPage(
  props: PageProps<"/menu/[stallSlug]">,
) {
  const { stallSlug } = await props.params;
  const result = await getStallCatalog(stallSlug);

  if (!result.ok && result.reason === "not_found") notFound();
  if (!result.ok) {
    return (
      <EmptyState
        icon={<HistoryIcon className="size-10" />}
        title="Lapak sedang tidak menerima pesanan"
        description="Tagihan Biaya Layanan Lapak ini belum lunas. Coba lagi nanti."
      />
    );
  }
  const { catalog } = result;

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

      {catalog.merchant.address ? (
        <Card className="flex flex-wrap items-center gap-3">
          <p className="min-w-0 flex-1 truncate text-sm text-ink-muted">
            {catalog.merchant.address}
          </p>
          {catalog.merchant.latitude != null &&
          catalog.merchant.longitude != null ? (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${catalog.merchant.latitude},${catalog.merchant.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Buka di Peta"
              title="Buka di Peta"
              className={buttonClasses({
                size: "md",
                className: "w-11 shrink-0 px-0",
              })}
            >
              <MapPinIcon className="size-6 shrink-0" />
            </a>
          ) : null}
        </Card>
      ) : null}

      {!catalog.merchant.isOpen ? (
        <ClosedStallNotice reopensAt={catalog.merchant.reopensAt} />
      ) : null}

      {catalog.products.length === 0 ? (
        <EmptyState
          icon={<ImageOffIcon className="size-10" />}
          title="Belum ada Item"
          description="Lapak ini belum menambahkan menu apa pun."
        />
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
