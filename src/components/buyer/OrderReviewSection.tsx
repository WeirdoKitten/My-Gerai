"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { StarIcon } from "@/components/ui/icons";
import { StarRating } from "@/components/ui/StarRating";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils/cn";
import { REVIEW_COMMENT_MAX_LENGTH } from "@/lib/validation/review.schema";
import { submitOrderReview } from "@/server/reviews";
import type { OrderReviewView } from "@/types/review";

const RATING_LABELS = ["", "Buruk", "Kurang", "Cukup", "Bagus", "Sangat bagus"];

/**
 * Rating & Ulasan Gerai di halaman status Pesanan — hanya dirender saat
 * Pesanan `selesai`. Sekali kirim, final (tidak bisa diubah).
 */
export function OrderReviewSection({
  orderId,
  stallName,
  initialReview,
}: {
  orderId: string;
  stallName: string;
  initialReview: OrderReviewView | null;
}) {
  const [review, setReview] = useState(initialReview);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (review) {
    return (
      <Card className="flex flex-col gap-2">
        <p className="font-semibold text-ink">Ulasanmu</p>
        <StarRating value={review.rating} size="md" />
        {review.comment ? (
          <p className="whitespace-pre-line break-words text-sm text-ink">
            {review.comment}
          </p>
        ) : null}
        <p className="text-xs text-ink-muted">
          Terima kasih sudah memberi ulasan!
        </p>
      </Card>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rating === 0) {
      setError("Pilih 1 sampai 5 bintang dulu.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await submitOrderReview({ orderId, rating, comment });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setReview({
      rating,
      comment: comment.trim() || null,
      createdAt: new Date().toISOString(),
    });
  }

  return (
    <Card pad="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <p className="font-semibold text-ink">Bagaimana pesananmu?</p>
          <p className="text-sm text-ink-muted">
            Beri rating untuk {stallName}. Ulasanmu membantu Pembeli lain.
          </p>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div
            role="radiogroup"
            aria-label="Rating"
            className="flex items-center gap-1"
          >
            {[1, 2, 3, 4, 5].map((star) => (
              // biome-ignore lint/a11y/useSemanticElements: tombol bintang lebih mudah disentuh di HP daripada input radio bawaan
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={rating === star}
                aria-label={`${star} bintang`}
                onClick={() => setRating(star)}
                className="flex size-11 items-center justify-center rounded-control focus-visible:outline-2 focus-visible:outline-brand"
              >
                <StarIcon
                  filled={star <= rating}
                  className={cn(
                    "size-8",
                    star <= rating ? "text-brand" : "text-line",
                  )}
                />
              </button>
            ))}
          </div>
          <p className="h-5 text-sm font-semibold text-brand-strong">
            {RATING_LABELS[rating]}
          </p>
        </div>

        <Field
          label="Ulasan (opsional)"
          hint={`${comment.length}/${REVIEW_COMMENT_MAX_LENGTH} karakter`}
        >
          <Textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={REVIEW_COMMENT_MAX_LENGTH}
            placeholder="Ceritakan pengalamanmu, mis. rasa, kualitas, atau pelayanan"
          />
        </Field>

        {error ? <Alert tone="error">{error}</Alert> : null}

        <Button type="submit" fullWidth loading={submitting}>
          {submitting ? "Mengirim..." : "Kirim Ulasan"}
        </Button>
      </form>
    </Card>
  );
}
