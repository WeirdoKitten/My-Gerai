"use client";

import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { PhotoThumb } from "@/components/ui/PhotoThumb";
import { resizeImage } from "@/lib/upload/resize-image";
import {
  getProductVariantGroups,
  saveProductVariantGroups,
} from "@/server/product-variants";
import {
  createProduct,
  updateProduct,
  uploadProductPhoto,
} from "@/server/products";
import type { MerchantProductView } from "@/types/product";
import {
  type EditableVariantGroup,
  ProductVariantEditor,
  toVariantGroupsInput,
} from "./ProductVariantEditor";

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
  const [costPrice, setCostPrice] = useState(
    product?.costPrice != null ? String(product.costPrice) : "",
  );
  const [stock, setStock] = useState(
    product?.stock != null ? String(product.stock) : "",
  );
  const [photoUrl, setPhotoUrl] = useState<string | null>(
    product?.photoUrl ?? null,
  );
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Item baru belum punya grup varian (belum ada productId) — mulai kosong.
  // Item lama: dimuat dari server begitu modal dibuka.
  const [variantGroups, setVariantGroups] = useState<EditableVariantGroup[]>(
    [],
  );
  const [variantsLoading, setVariantsLoading] = useState(!!product);

  useEffect(() => {
    if (!product) return;
    let cancelled = false;
    getProductVariantGroups(product.id).then((loaded) => {
      if (cancelled) return;
      setVariantGroups(
        loaded.map((group) => ({
          localId: crypto.randomUUID(),
          name: group.name,
          options: group.options.map((option) => ({
            localId: crypto.randomUUID(),
            name: option.name,
            priceDelta: String(option.priceDelta),
          })),
        })),
      );
      setVariantsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [product]);

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
    const costPriceValue = costPrice.trim() === "" ? null : Number(costPrice);
    const stockValue = stock.trim() === "" ? null : Number(stock);

    let productId: string;
    if (product) {
      const result = await updateProduct({
        productId: product.id,
        name,
        description: description || undefined,
        price: priceNumber,
        costPrice: costPriceValue,
        stock: stockValue,
        photoUrl,
      });
      if (!result.ok) {
        setError(result.message ?? "Gagal menyimpan Item.");
        setSubmitting(false);
        return;
      }
      productId = product.id;
    } else {
      const result = await createProduct({
        name,
        description: description || undefined,
        price: priceNumber,
        costPrice: costPriceValue,
        stock: stockValue,
        photoUrl,
      });
      if (!result.ok) {
        setError(result.message ?? "Gagal menyimpan Item.");
        setSubmitting(false);
        return;
      }
      productId = result.productId;
    }
    const variantResult = await saveProductVariantGroups({
      productId,
      groups: toVariantGroupsInput(variantGroups),
    });
    if (!variantResult.ok) {
      setError(variantResult.message ?? "Gagal menyimpan varian.");
      setSubmitting(false);
      return;
    }

    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
      <Field label="Harga Jual (Rp)">
        <Input
          type="number"
          inputMode="numeric"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
          min={0}
        />
      </Field>
      <Field
        label="Harga Modal (Rp)"
        hint="Opsional. Dipakai untuk hitung keuntungan di Laporan Penjualan."
      >
        <Input
          type="number"
          inputMode="numeric"
          value={costPrice}
          onChange={(e) => setCostPrice(e.target.value)}
          min={0}
          placeholder="Belum diisi"
        />
      </Field>
      <Field label="Stok" hint="Kosongkan kalau tidak dibatasi.">
        <Input
          type="number"
          inputMode="numeric"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          min={0}
          placeholder="Tidak dibatasi"
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

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-ink">
          Varian (opsional)
        </span>
        <p className="text-xs text-ink-muted">
          Mis. Level Pedas, Ukuran, atau Warna. Stok tetap satu untuk seluruh
          Item, tidak dipisah per pilihan.
        </p>
        {variantsLoading ? (
          <p className="text-sm text-ink-muted">Memuat varian...</p>
        ) : (
          <ProductVariantEditor
            groups={variantGroups}
            onChange={setVariantGroups}
          />
        )}
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}
      <div className="flex gap-2">
        <Button
          type="submit"
          fullWidth
          loading={submitting}
          disabled={uploading || variantsLoading}
        >
          {submitting ? "Menyimpan..." : "Simpan"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Batal
        </Button>
      </div>
    </form>
  );
}
