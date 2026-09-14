import { ClearOverrideButton } from "@/components/merchant/ClearOverrideButton";
import { OperatingHoursForm } from "@/components/merchant/OperatingHoursForm";
import { Alert } from "@/components/ui/Alert";
import { cn } from "@/lib/utils/cn";
import { formatDateTime } from "@/lib/utils/datetime";
import { getMerchantOpenStatus } from "@/server/merchants";

export default async function MerchantSchedulePage() {
  const status = await getMerchantOpenStatus();
  if (!status) return null;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-ink">Jadwal Operasional</h2>
      <p className="text-sm text-ink-muted">
        Atur jam buka Lapak per hari. Kalau jadwal sudah diisi, status
        buka/tutup di header mengikutinya otomatis — tidak perlu pencet toggle
        manual tiap hari.
      </p>

      <Alert
        tone={status.isOpen ? "success" : "warning"}
        className={cn(
          "border",
          status.isOpen ? "border-success/30" : "border-warning/40",
        )}
      >
        Status saat ini: <strong>{status.isOpen ? "Buka" : "Tutup"}</strong>
        {!status.isOpen && status.reopensAt
          ? ` — buka lagi ${formatDateTime(new Date(status.reopensAt))}`
          : null}
      </Alert>

      {status.manualOverride ? (
        <Alert tone="info" className="flex flex-col items-start gap-2">
          <span>
            Kamu sedang meng-override status manual (
            {status.manualOverride === "open"
              ? "dipaksa buka"
              : "dipaksa tutup"}
            ). Override ini otomatis lepas begitu masuk batas jadwal berikutnya,
            atau tekan tombol di bawah untuk langsung kembali ikut jadwal
            sekarang.
          </span>
          <ClearOverrideButton />
        </Alert>
      ) : null}

      <OperatingHoursForm initialHours={status.hours} />
    </div>
  );
}
