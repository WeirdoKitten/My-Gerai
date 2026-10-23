"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { PlusIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";
import { createProxyStall } from "@/server/events";
import type { EventMerchantOption } from "@/types/event";
import { EventOrganizerQrisUploader } from "./EventOrganizerQrisUploader";

/**
 * Buat Gerai Titipan untuk toko yang belum terdaftar di MyGerai. EO yang
 * membelikan barangnya; Gerai langsung ditambahkan ke event. Kalau EO belum
 * punya QRIS "uang jasa titipan", pop-up meminta unggah QRIS dulu.
 */
export function CreateProxyStallButton({
  eventId,
  disabled,
  hasQris: initialHasQris,
  onCreated,
}: {
  eventId: string;
  disabled: boolean;
  hasQris: boolean;
  onCreated: (merchant: EventMerchantOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hasQris, setHasQris] = useState(initialHasQris);
  const [stallName, setStallName] = useState("");
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await createProxyStall({ eventId, stallName, category });
    setSubmitting(false);
    if (!result.ok) {
      if (result.needsQris) setHasQris(false);
      setError(result.message);
      return;
    }
    setOpen(false);
    setStallName("");
    setCategory("");
    onCreated(result.merchant);
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={disabled}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="self-start"
      >
        <PlusIcon className="size-4" />
        Buat Gerai Titipan
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={hasQris ? "Buat Gerai Titipan" : "Unggah QRIS dulu"}
      >
        {hasQris ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-sm text-ink-muted">
              Untuk toko yang belum terdaftar di MyGerai. Peserta memesan lalu
              membayar langsung ke QRIS kamu; kamu yang membelikan barangnya dan
              menyerahkannya. Tandai Lunas di antrean Gerai setelah uang masuk.
            </p>
            <Field label="Nama Gerai" hint="Biasanya sama dengan nama tokonya.">
              <Input
                value={stallName}
                onChange={(e) => setStallName(e.target.value)}
                maxLength={100}
                placeholder="Contoh: Toko Oleh-oleh Bu Ani"
                required
              />
            </Field>
            <Field label="Kategori">
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                maxLength={50}
                placeholder="Contoh: Oleh-oleh"
                required
              />
            </Field>
            {error ? <Alert tone="error">{error}</Alert> : null}
            <Button type="submit" fullWidth loading={submitting}>
              {submitting ? "Membuat..." : "Buat & Tambahkan ke Event"}
            </Button>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <Alert tone="warning">
              Gerai Titipan wajib memakai QRIS kamu sendiri. Pembeli membayar
              langsung ke QRIS ini sebagai uang jasa titipan, lalu kamu pakai
              untuk membelikan barangnya.
            </Alert>
            <p className="text-sm text-ink-muted">
              Unggah foto QRIS (dari aplikasi bank atau e-wallet). QRIS ini
              dipakai semua Gerai Titipan kamu dan bisa diganti kapan saja di
              halaman Event.
            </p>
            <EventOrganizerQrisUploader
              initialUrl={null}
              onUploaded={() => {
                setError(null);
                setHasQris(true);
              }}
            />
          </div>
        )}
      </Modal>
    </>
  );
}
