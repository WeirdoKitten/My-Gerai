"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { createEvent } from "@/server/events";

export function CreateEventForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await createEvent({ name, location, description });
    if (!result.ok) {
      setError(result.message);
      setSubmitting(false);
      return;
    }
    router.push(`/eo/event/${result.eventId}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Nama event" hint="Contoh: Wisata Kuliner Garut 2026">
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
        />
      </Field>
      <Field label="Lokasi (opsional)">
        <Input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          maxLength={200}
        />
      </Field>
      <Field
        label="Info untuk peserta (opsional)"
        hint="Mis. jam & tempat pengambilan oleh-oleh."
      >
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
        />
      </Field>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Button type="submit" fullWidth loading={submitting}>
        {submitting ? "Membuat..." : "Buat Event"}
      </Button>
    </form>
  );
}
