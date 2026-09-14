"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { clearMerchantOverride } from "@/server/merchants";

/** Tombol "Ikuti Jadwal Lagi" — hapus override manual tanpa perlu menunggu batas jadwal berikutnya. */
export function ClearOverrideButton() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleClick() {
    setSubmitting(true);
    await clearMerchantOverride();
    setSubmitting(false);
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      loading={submitting}
      onClick={handleClick}
    >
      Ikuti Jadwal Lagi
    </Button>
  );
}
