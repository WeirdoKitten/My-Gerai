"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { registerEventOrganizer } from "@/server/event-organizers";

export function RegisterEventOrganizerForm() {
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await registerEventOrganizer({
      organizationName,
      contactName,
      phone,
      password,
    });

    if (!result.ok) {
      setError(result.message);
      setSubmitting(false);
      return;
    }
    router.push("/eo/daftar/status");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Nama EO / organisasi">
        <Input
          type="text"
          value={organizationName}
          onChange={(e) => setOrganizationName(e.target.value)}
          required
          maxLength={100}
        />
      </Field>
      <Field label="Nama penanggung jawab">
        <Input
          type="text"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          required
          maxLength={100}
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
