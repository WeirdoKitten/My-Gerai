"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { loginMerchant } from "@/server/merchants";

export function LoginMerchantForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setInfo(null);

    const result = await loginMerchant({ phone, password });

    if (!result.ok) {
      setError(result.message);
      setSubmitting(false);
      return;
    }
    if (result.status === "approved") {
      router.push("/dashboard");
      return;
    }
    setInfo(result.message);
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Nomor HP">
        <Input
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </Field>
      <Field label="Password">
        <Input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </Field>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {info ? <Alert tone="warning">{info}</Alert> : null}
      <Button type="submit" fullWidth loading={submitting}>
        {submitting ? "Masuk..." : "Masuk"}
      </Button>
    </form>
  );
}
