"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { updateMerchantProfile } from "@/server/merchants";
import type { MerchantProfileView } from "@/types/merchant";

export function MerchantProfileForm({
  profile,
}: {
  profile: MerchantProfileView;
}) {
  const router = useRouter();
  const [stallName, setStallName] = useState(profile.stallName);
  const [ownerName, setOwnerName] = useState(profile.ownerName);
  const [category, setCategory] = useState(profile.category);
  const [payoutAccountInfo, setPayoutAccountInfo] = useState(
    profile.payoutAccountInfo ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const result = await updateMerchantProfile({
      stallName,
      ownerName,
      category,
      payoutAccountInfo: payoutAccountInfo || undefined,
    });

    if (!result.ok) {
      setError(result.message ?? "Gagal menyimpan profil.");
      setSubmitting(false);
      return;
    }
    setMessage(result.message ?? "Profil diperbarui.");
    setSubmitting(false);
    router.refresh();
  }

  return (
    <Card as="form" onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Nama Lapak">
        <Input
          value={stallName}
          onChange={(e) => setStallName(e.target.value)}
          required
          maxLength={100}
        />
      </Field>
      <Field label="Nama Pemilik">
        <Input
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          required
          maxLength={100}
        />
      </Field>
      <Field label="Kategori" hint="mis. Makanan, Minuman, Pakaian">
        <Input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
          maxLength={50}
        />
      </Field>
      <Field
        label="Info Rekening / E-wallet Pencairan"
        hint="Ke mana Admin mengirim uang saat pencairan. Opsional."
      >
        <Textarea
          value={payoutAccountInfo}
          onChange={(e) => setPayoutAccountInfo(e.target.value)}
          maxLength={300}
          placeholder="mis. BCA 1234567890 a.n. Budi — atau GoPay 0812xxxxxxx"
        />
      </Field>
      <Field label="Nomor HP (untuk login)" hint="Belum bisa diubah dari sini.">
        <Input value={profile.phone} disabled />
      </Field>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}
      <Button type="submit" fullWidth loading={submitting}>
        {submitting ? "Menyimpan..." : "Simpan Profil"}
      </Button>
    </Card>
  );
}
