"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import { updateMerchantDeliverySettings } from "@/server/merchants";
import type { MerchantDeliverySettingsView } from "@/types/merchant";

/** Pengaturan Pesanan Antar Lapak sendiri (Fase 11): toggle, Ongkir, jangkauan. */
export function DeliverySettingsForm({
  initialSettings,
}: {
  initialSettings: MerchantDeliverySettingsView;
}) {
  const [enabled, setEnabled] = useState(initialSettings.deliveryEnabled);
  const [fee, setFee] = useState(
    initialSettings.deliveryFee === null
      ? ""
      : String(initialSettings.deliveryFee),
  );
  const [radiusKm, setRadiusKm] = useState(
    String(initialSettings.deliveryRadiusKm),
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSaved(false);

    const result = await updateMerchantDeliverySettings({
      deliveryEnabled: enabled,
      deliveryFee: fee.trim() === "" ? null : Number(fee),
      deliveryRadiusKm: Number(radiusKm.replace(",", ".")),
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message ?? "Gagal menyimpan pengaturan.");
      return;
    }
    setSaved(true);
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {initialSettings.hasLocation ? null : (
          <Alert tone="warning">
            Pasang titik lokasi Lapak dulu di{" "}
            <Link href="/dashboard/profil" className="font-semibold underline">
              Profil
            </Link>
            , karena jangkauan antar dihitung dari titik itu.
          </Alert>
        )}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-ink">Terima pesanan antar</p>
            <p className="text-sm text-ink-muted">
              Bisa dimatikan kapan saja, contohnya saat sedang ramai atau sedang
              mengantar.
            </p>
          </div>
          <Toggle
            checked={enabled}
            onChange={(next) => {
              setEnabled(next);
              setSaved(false);
            }}
            disabled={!initialSettings.hasLocation}
            label="Terima pesanan antar"
          />
        </div>
        <Field label="Ongkir (Rp)" hint="Tarif tetap per pesanan antar.">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={100000}
            step={500}
            value={fee}
            onChange={(e) => {
              setFee(e.target.value);
              setSaved(false);
            }}
            placeholder="5000"
          />
        </Field>
        <Field
          label="Jangkauan maksimal (km)"
          hint="Jarak garis lurus dari titik Lapak ke titik Pembeli."
        >
          <Input
            type="number"
            inputMode="decimal"
            min={0.5}
            max={20}
            step={0.5}
            value={radiusKm}
            onChange={(e) => {
              setRadiusKm(e.target.value);
              setSaved(false);
            }}
          />
        </Field>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {saved ? (
          <Alert tone="success">Pengaturan antar disimpan.</Alert>
        ) : null}
        <Button type="submit" fullWidth loading={submitting}>
          {submitting ? "Menyimpan..." : "Simpan"}
        </Button>
      </form>
    </Card>
  );
}
