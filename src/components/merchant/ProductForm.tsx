"use client";

import { useState } from "react";
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
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Nama Item
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Deskripsi (opsional)
        </span>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Harga (Rp)
        </span>
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
          min={0}
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="h-10 flex-1 rounded-md bg-zinc-900 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {submitting ? "Menyimpan..." : "Simpan"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-10 rounded-md border border-zinc-300 px-4 text-sm font-medium dark:border-zinc-700"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
