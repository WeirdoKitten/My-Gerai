"use client";

import { useState } from "react";
import { registerMerchant } from "@/server/merchants";

export function RegisterMerchantForm() {
  const [stallName, setStallName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [category, setCategory] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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
    setSuccessMessage(result.message);
    setSubmitting(false);
  }

  if (successMessage) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
        <p>{successMessage}</p>
        <a href="/login" className="mt-2 inline-block font-medium underline">
          Ke halaman Login
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Nama Lapak
        </span>
        <input
          type="text"
          value={stallName}
          onChange={(e) => setStallName(e.target.value)}
          required
          maxLength={100}
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Nama Pedagang
        </span>
        <input
          type="text"
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          required
          maxLength={100}
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Kategori
        </span>
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
          maxLength={50}
          placeholder="mis. Makanan, Pakaian"
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Nomor HP
        </span>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          placeholder="081234567890"
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Password
        </span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={submitting}
        className="h-11 rounded-md bg-zinc-900 font-medium text-white disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {submitting ? "Mendaftar..." : "Daftar"}
      </button>
    </form>
  );
}
