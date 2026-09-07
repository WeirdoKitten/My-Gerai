"use client";

import { useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { PhotoThumb } from "@/components/ui/PhotoThumb";
import { resizeImage } from "@/lib/upload/resize-image";
import {
  createProduct,
  updateProduct,
  uploadProductPhoto,
} from "@/server/products";
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
  const [photoUrl, setPhotoUrl] = useState<string | null>(
    product?.photoUrl ?? null,
  );
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setPhotoError(null);
    try {
      const resized = await resizeImage(file);
      const formData = new FormData();
      formData.append("file", resized, "foto.jpg");
      const result = await uploadProductPhoto(formData);
      if (!result.ok) {
        setPhotoError(result.message);
        return;
      }
      setPhotoUrl(result.url);
    } catch {
      setPhotoError("Gagal memproses foto. Coba foto lain.");
    } finally {
      setUploading(false);
    }
  }

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
          photoUrl,
        })
      : await createProduct({
          name,
          description: description || undefined,
          price: priceNumber,
          photoUrl,
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

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-ink">Foto (opsional)</span>
        <div className="flex items-center gap-3">
          <PhotoThumb src={photoUrl} alt="Pratinjau foto Item" />
          <div className="flex flex-col gap-1.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading
                ? "Mengunggah..."
                : photoUrl
                  ? "Ganti Foto"
                  : "Tambah Foto"}
            </Button>
            {photoUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPhotoUrl(null)}
              >
                Hapus Foto
              </Button>
            ) : null}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handlePhotoChange}
        />
        {photoError ? <Alert tone="error">{photoError}</Alert> : null}
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}
      <div className="flex gap-2">
        <Button
          type="submit"
          fullWidth
          loading={submitting}
          disabled={uploading}
        >
          {submitting ? "Menyimpan..." : "Simpan"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Batal
        </Button>
      </div>
    </Card>
  );
}
