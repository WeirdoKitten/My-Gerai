import { z } from "zod";

export const loginAdminSchema = z.object({
  phone: z.string().trim().min(1, "Nomor HP wajib diisi."),
  password: z.string().min(1, "Password wajib diisi."),
});

export type LoginAdminInput = z.infer<typeof loginAdminSchema>;
