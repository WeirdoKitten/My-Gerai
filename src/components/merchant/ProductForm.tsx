"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { createProduct, updateProduct } from "@/server/products";
import type { MerchantProductView } from "@/types/product";

export function ProductForm({
  product,
  onDone,
  onCancel,
}: {
  product?: MerchantProductView;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const priceNumber = Number(price);
    const result = product
      ? await updateProduct({
          productId: product.id,
          name,
          description: description || undefined,
          price: priceNumber,
        })
      : await createProduct({
          name,
          description: description || undefined,
          price: priceNumber,
        });

    if (!result.ok) {
      setError(result.message ?? "Gagal menyimpan Item.");
      setSubmitting(false);
      return;
    }
    onDone();
  }

  return (
    <Card as="form" onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Nama Item">
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
        />
      </Field>
      <Field label="Deskripsi" hint="Opsional.">
        <Input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
        />
      </Field>
      <Field label="Harga (Rp)">
        <Input
          type="number"
          inputMode="numeric"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
          min={0}
        />
      </Field>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <div className="flex gap-2">
        <Button type="submit" fullWidth loading={submitting}>
          {submitting ? "Menyimpan..." : "Simpan"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Batal
        </Button>
      </div>
    </Card>
  );
}
