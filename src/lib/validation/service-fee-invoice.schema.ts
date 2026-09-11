import { z } from "zod";

export const markServiceFeeInvoicePaidSchema = z.object({
  invoiceId: z.uuid(),
  note: z.string().trim().max(500).optional(),
});

export type MarkServiceFeeInvoicePaidInput = z.infer<
  typeof markServiceFeeInvoicePaidSchema
>;

export const voidServiceFeeInvoiceSchema = z.object({
  invoiceId: z.uuid(),
  reason: z
    .string()
    .trim()
    .min(3, "Alasan wajib diisi (minimal 3 karakter).")
    .max(500),
});

export type VoidServiceFeeInvoiceInput = z.infer<
  typeof voidServiceFeeInvoiceSchema
>;
