"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { recordPayout } from "@/server/payouts";

export function RecordPayoutForm({
  merchantId,
  balance,
  onDone,
  onCancel,
}: {
  merchantId: string;
  balance: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState(String(balance));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await recordPayout({
      merchantId,
      amount: Number(amount),
      note: note || undefined,
    });

    if (!result.ok) {
      setError(result.message ?? "Gagal mencatat Pencairan.");
      setSubmitting(false);
      return;
    }
    onDone();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 flex flex-col gap-3 border-t border-line pt-3"
    >
      <Field label="Nominal (Rp)">
        <Input
          type="number"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          min={1}
          max={balance}
        />
      </Field>
      <Field label="Catatan" hint="Opsional.">
        <Input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
        />
      </Field>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" fullWidth loading={submitting}>
          {submitting ? "Menyimpan..." : "Konfirmasi Pencairan"}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Batal
        </Button>
      </div>
    </form>
  );
}
