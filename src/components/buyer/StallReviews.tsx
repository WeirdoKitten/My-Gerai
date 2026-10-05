import { Card } from "@/components/ui/Card";
import { StarRating } from "@/components/ui/StarRating";
import { formatRating } from "@/lib/review/rating";
import { formatDate } from "@/lib/utils/datetime";
import type { StallCatalogView } from "@/types/product";

/** Ringkas rating di header halaman menu, mis. "★ 4,7 · 12 ulasan" (tautan ke daftar ulasan). */
export function StallRatingSummary({
  summary,
}: {
  summary: StallCatalogView["reviews"]["summary"];
}) {
  if (summary.average === null) return null;
  return (
    <a
      href="#ulasan"
      className="mt-1 inline-flex items-center gap-1.5 text-sm text-ink-muted"
    >
      <StarRating value={summary.average} />
      <span className="font-semibold text-ink">
        {formatRating(summary.average)}
      </span>
      <span>· {summary.count} ulasan</span>
    </a>
  );
}

/** Daftar ulasan terbaru di bawah katalog menu (nama Pembeli sudah disamarkan server). */
export function StallReviewList({
  reviews,
}: {
  reviews: StallCatalogView["reviews"];
}) {
  return (
    <section id="ulasan" className="flex scroll-mt-4 flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-ink">Rating & Ulasan</h2>
        {reviews.summary.average !== null ? (
          <p className="text-sm text-ink-muted">
            <span className="font-semibold text-ink">
              {formatRating(reviews.summary.average)}
            </span>{" "}
            dari 5 · {reviews.summary.count} ulasan
          </p>
        ) : null}
      </div>

      {reviews.recent.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Belum ada ulasan. Pesan dan jadilah yang pertama memberi ulasan!
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {reviews.recent.map((review) => (
            <li key={review.id}>
              <Card className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-ink">
                    {review.buyerDisplayName}
                  </p>
                  <p className="shrink-0 text-xs text-ink-muted">
                    {formatDate(new Date(review.createdAt))}
                  </p>
                </div>
                <StarRating value={review.rating} />
                {review.comment ? (
                  <p className="whitespace-pre-line break-words text-sm text-ink">
                    {review.comment}
                  </p>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
