import { formatRupiah } from "@/lib/utils/money";
import type { OrderItemSubstitutionView } from "@/types/order";

/**
 * Keterangan penggantian Item Gerai Titipan, dipakai di kartu Pesanan
 * Pedagang/EO dan halaman status Pembeli. `audience` hanya mengubah kalimat
 * uang kembali: Pembeli "dikembalikan", pengelola "kembalikan".
 */
export function OrderItemSubstitutionNote({
  substitution,
  audience,
}: {
  substitution: OrderItemSubstitutionView | null;
  audience: "buyer" | "seller";
}) {
  if (!substitution) return null;

  if (substitution.kind === "diganti") {
    return (
      <p className="text-xs font-semibold text-info">
        Diganti dengan: {substitution.substituteName}
      </p>
    );
  }
  return (
    <p className="text-xs font-semibold text-danger">
      Tidak tersedia ·{" "}
      {audience === "buyer"
        ? `${formatRupiah(substitution.refundAmount)} dikembalikan saat serah terima`
        : `kembalikan ${formatRupiah(substitution.refundAmount)} ke Pembeli`}
    </p>
  );
}
