"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { setProxyStallActive } from "@/server/merchants";
import type { AdminMerchantView } from "@/types/admin";

/** Nonaktifkan/aktifkan lagi Gerai Titipan milik EO (Admin). */
export function ProxyStallActiveControl({
  merchant,
  onChanged,
}: {
  merchant: AdminMerchantView;
  onChanged: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = merchant.status === "approved";

  async function handleToggle() {
    setSubmitting(true);
    setError(null);
    const result = await setProxyStallActive({
      merchantId: merchant.id,
      active: !active,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message ?? "Gagal mengubah status.");
      return;
    }
    onChanged();
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Button
        type="button"
        size="sm"
        variant={active ? "dangerOutline" : "secondary"}
        loading={submitting}
        onClick={handleToggle}
        className="self-start"
      >
        {active ? "Nonaktifkan Gerai Titipan" : "Aktifkan lagi"}
      </Button>
    </div>
  );
}
