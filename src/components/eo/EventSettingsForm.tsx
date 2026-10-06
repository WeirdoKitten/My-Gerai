"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { Toggle } from "@/components/ui/Toggle";
import { updateEvent } from "@/server/events";
import type { EventDetailView } from "@/types/event";

export function EventSettingsForm({ event }: { event: EventDetailView }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState(event.name);
  const [location, setLocation] = useState(event.location ?? "");
  const [description, setDescription] = useState(event.description ?? "");
  const [isActive, setIsActive] = useState(event.isActive);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await updateEvent({
      eventId: event.id,
      name,
      location,
      description,
      isActive,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message ?? "Gagal menyimpan event.");
      return;
    }
    showToast("Event disimpan");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-ink">Event aktif</span>
          <span className="text-xs text-ink-muted">
            Nonaktif = peserta tidak bisa memesan lewat QR event.
          </span>
        </div>
        <Toggle checked={isActive} onChange={setIsActive} label="Event aktif" />
      </div>
      <Field label="Nama event">
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
        {submitting ? "Menyimpan..." : "Simpan Event"}
      </Button>
    </form>
  );
}
