import { redirect } from "next/navigation";
import { MerchantReviewList } from "@/components/merchant/MerchantReviewList";
import { hasAnyProduct } from "@/server/products";
import { listMerchantReviews } from "@/server/reviews";

export default async function MerchantReviewsPage() {
  if (!(await hasAnyProduct())) redirect("/dashboard/produk");

  const page = await listMerchantReviews();
  if (!page) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-ink">Rating & Ulasan</h2>
      <MerchantReviewList page={page} />
    </div>
  );
}
