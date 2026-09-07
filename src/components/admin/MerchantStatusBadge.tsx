import { Badge, type BadgeTone } from "@/components/ui/Badge";
import type { AdminMerchantView } from "@/types/admin";

type Status = AdminMerchantView["status"];

const LABEL: Record<Status, string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
  suspended: "Nonaktif",
};

const TONE: Record<Status, BadgeTone> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  suspended: "neutral",
};

export function MerchantStatusBadge({ status }: { status: Status }) {
  return <Badge tone={TONE[status]}>{LABEL[status]}</Badge>;
}
