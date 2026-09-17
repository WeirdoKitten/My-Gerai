"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { registerMerchant } from "@/server/merchants";

export function RegisterMerchantForm() {
  const router = useRouter();
  const [stallName, setStallName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [category, setCategory] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await registerMerchant({
      stallName,
      ownerName,
      category,
      phone,
      password,
    });

    if (!result.ok) {
      setError(result.message);
      setSubmitting(false);
      return;
    }
    router.push("/daftar/status");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Nama Lapak">
        <Input
          type="text"
          value={stallName}
          onChange={(e) => setStallName(e.target.value)}
          required
          maxLength={100}
        />
      </Field>
      <Field label="Nama Pedagang">
        <Input
          type="text"
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          required
          maxLength={100}
        />
      </Field>
      <Field label="Kategori" hint="mis. Makanan, Minuman, Pakaian">
        <Input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
          maxLength={50}
        />
      </Field>
      <Field label="Nomor HP">
        <Input
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          placeholder="081234567890"
        />
      </Field>
      <Field label="Password" hint="Minimal 8 karakter.">
        <Input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </Field>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Button type="submit" fullWidth loading={submitting}>
        {submitting ? "Mendaftar..." : "Daftar"}
      </Button>
    </form>
  );
}
