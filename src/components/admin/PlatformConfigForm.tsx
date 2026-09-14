"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { updatePlatformConfig } from "@/server/config";
import type { PlatformConfigView } from "@/types/config";

export function PlatformConfigForm({
  current,
}: {
  current: PlatformConfigView;
}) {
  const router = useRouter();
  const [platformFeeAmount, setPlatformFeeAmount] = useState(
    String(current.platformFeeAmount),
  );
  const [orderExpiryMinutes, setOrderExpiryMinutes] = useState(
    String(current.orderExpiryMinutes),
  );
  const [serviceFeeBillingCycleDays, setServiceFeeBillingCycleDays] = useState(
    String(current.serviceFeeBillingCycleDays),
  );
  const [serviceFeeGracePeriodDays, setServiceFeeGracePeriodDays] = useState(
    String(current.serviceFeeGracePeriodDays),
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const result = await updatePlatformConfig({
      platformFeeAmount: Number(platformFeeAmount),
      orderExpiryMinutes: Number(orderExpiryMinutes),
      serviceFeeBillingCycleDays: Number(serviceFeeBillingCycleDays),
      serviceFeeGracePeriodDays: Number(serviceFeeGracePeriodDays),
    });

    if (!result.ok) {
      setError(result.message ?? "Gagal menyimpan.");
      setSubmitting(false);
      return;
    }
    setMessage(result.message ?? "Konfigurasi diperbarui.");
    setSubmitting(false);
    router.refresh();
  }

  return (
    <Card as="form" onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Biaya Layanan (Rp)">
        <Input
          type="number"
          inputMode="numeric"
          value={platformFeeAmount}
          onChange={(e) => setPlatformFeeAmount(e.target.value)}
          required
          min={0}
        />
      </Field>
      <Field label="Durasi Kedaluwarsa Pesanan (menit)">
        <Input
          type="number"
          inputMode="numeric"
          value={orderExpiryMinutes}
          onChange={(e) => setOrderExpiryMinutes(e.target.value)}
          required
          min={1}
        />
      </Field>
      <Field label="Siklus Tagihan Biaya Layanan QRIS Pribadi (hari)">
        <Input
          type="number"
          inputMode="numeric"
          value={serviceFeeBillingCycleDays}
          onChange={(e) => setServiceFeeBillingCycleDays(e.target.value)}
          required
          min={1}
        />
      </Field>
      <Field label="Masa Tenggang Sebelum Lapak Dikunci (hari)">
        <Input
          type="number"
          inputMode="numeric"
          value={serviceFeeGracePeriodDays}
          onChange={(e) => setServiceFeeGracePeriodDays(e.target.value)}
          required
          min={0}
        />
      </Field>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}
      <Button type="submit" fullWidth loading={submitting}>
        {submitting ? "Menyimpan..." : "Simpan"}
      </Button>
    </Card>
  );
}
