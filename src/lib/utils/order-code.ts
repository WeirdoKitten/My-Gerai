// Tanpa 0/O/1/I — gampang dibedakan saat disebutkan lisan (lihat DATA-MODEL.md#orders-pesanan).
const ORDER_CODE_CHARSET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const ORDER_CODE_LENGTH = 4;

export function generateOrderCode(): string {
  let code = "";
  for (let i = 0; i < ORDER_CODE_LENGTH; i++) {
    code +=
      ORDER_CODE_CHARSET[Math.floor(Math.random() * ORDER_CODE_CHARSET.length)];
  }
  return code;
}
