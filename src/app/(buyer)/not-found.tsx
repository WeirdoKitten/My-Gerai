import { EmptyState } from "@/components/ui/EmptyState";
import { StoreIcon } from "@/components/ui/icons";

export default function BuyerNotFound() {
  return (
    <EmptyState
      icon={<StoreIcon className="size-10" />}
      title="Lapak tidak ditemukan"
      description="Lapak yang kamu cari tidak ada, sudah tidak aktif, atau tautannya salah."
    />
  );
}
