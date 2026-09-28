import type { Metadata } from "next";
import { TrackOrderView } from "@/components/buyer/TrackOrderView";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "Lacak Pesanan",
};

export default function TrackOrderPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Lacak Pesanan"
        subtitle="Buka lagi status pesananmu tanpa perlu akun."
      />
      <TrackOrderView />
    </div>
  );
}
