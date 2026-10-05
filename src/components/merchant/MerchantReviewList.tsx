import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StarIcon } from "@/components/ui/icons";
import { StarRating } from "@/components/ui/StarRating";
import { formatRating } from "@/lib/review/rating";
import { formatDateTime } from "@/lib/utils/datetime";
import type { MerchantReviewsPage } from "@/types/review";

/** Rating & Ulasan Lapak sendiri di dashboard Pedagang (read-only). */
export function MerchantReviewList({ page }: { page: MerchantReviewsPage }) {
  if (page.summary.average === null) {
    return (
      <EmptyState
        icon={<StarIcon className="size-10" />}
        title="Belum ada ulasan"
        description="Pembeli bisa memberi rating & ulasan setelah Pesanan mereka selesai."
      />
    );
  }

  const maxCount = Math.max(...page.distribution, 1);

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex items-center gap-5">
        <div className="flex shrink-0 flex-col items-center gap-1">
          <p className="text-4xl font-extrabold tabular-nums text-ink">
            {formatRating(page.summary.average)}
          </p>
          <StarRating value={page.summary.average} />
          <p className="text-xs text-ink-muted">{page.summary.count} ulasan</p>
        </div>
        <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = page.distribution[star - 1];
            return (
              <li key={star} className="flex items-center gap-2 text-xs">
                <span className="w-3 shrink-0 tabular-nums text-ink-muted">
                  {star}
                </span>
                <div
                  className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-bg"
                  role="img"
                  aria-label={`${star} bintang: ${count} ulasan`}
                >
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right tabular-nums text-ink-muted">
                  {count}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      {page.reviews.map((review) => (
        <Card key={review.id} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-sm font-semibold text-ink">
              {review.buyerName}
            </p>
            <p className="shrink-0 text-xs tabular-nums text-ink-muted">
              {review.orderCode}
            </p>
          </div>
          <StarRating value={review.rating} />
          {review.comment ? (
            <p className="whitespace-pre-line break-words text-sm text-ink">
              {review.comment}
            </p>
          ) : null}
          <p className="text-xs text-ink-muted">
            {formatDateTime(new Date(review.createdAt))}
          </p>
        </Card>
      ))}
    </div>
  );
}
