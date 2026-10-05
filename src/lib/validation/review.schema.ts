import { z } from "zod";

export const REVIEW_COMMENT_MAX_LENGTH = 500;

export const submitOrderReviewSchema = z.object({
  orderId: z.uuid(),
  rating: z
    .number()
    .int()
    .min(1, "Pilih 1 sampai 5 bintang.")
    .max(5, "Pilih 1 sampai 5 bintang."),
  comment: z
    .string()
    .trim()
    .max(
      REVIEW_COMMENT_MAX_LENGTH,
      `Ulasan maksimal ${REVIEW_COMMENT_MAX_LENGTH} karakter.`,
    )
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional(),
});

export type SubmitOrderReviewInput = z.input<typeof submitOrderReviewSchema>;
