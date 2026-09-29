import { randomInt } from "node:crypto";

// Tanpa 0/O/1/I — gampang dibedakan saat disebutkan lisan (lihat DATA-MODEL.md#orders-pesanan).
const ORDER_CODE_CHARSET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const ORDER_CODE_LENGTH = 8;

/**
 * Kode Pesanan 8 karakter acak, mis. `K7QX9MB4` (2026-09-29). Kode ini juga
 * satu-satunya "kunci" halaman Lacak Pesanan, jadi WAJIB dari CSPRNG
 * (`crypto.randomInt`), bukan `Math.random` — 32^8 ≈ 1 triliun kombinasi,
 * ditambah rate-limit di `findOrderForTracking`.
 */
export function generateOrderCode(): string {
  let code = "";
  for (let i = 0; i < ORDER_CODE_LENGTH; i++) {
    code += ORDER_CODE_CHARSET[randomInt(ORDER_CODE_CHARSET.length)];
  }
  return code;
}

/** Bentuk Kode Pesanan format baru — dipakai validasi input Lacak Pesanan. */
export const ORDER_CODE_PATTERN = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/;
