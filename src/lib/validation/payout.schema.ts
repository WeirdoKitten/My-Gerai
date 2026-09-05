import { z } from "zod";

export const recordPayoutSchema = z.object({
  merchantId: z.uuid(),
  amount: z
    .number()
    .int()
    .min(1, "Nominal harus lebih dari 0.")
    .max(100_000_000),
  note: z.string().trim().max(500).optional(),
});

export type RecordPayoutInput = z.infer<typeof recordPayoutSchema>;
