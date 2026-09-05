"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { loginAdmin } from "@/server/admins";

export function LoginAdminForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await loginAdmin({ phone, password });

    if (!result.ok) {
      setError(result.message);
      setSubmitting(false);
      return;
    }
    router.push("/admin/merchants");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Nomor HP
        </span>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
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
        {submitting ? "Masuk..." : "Masuk"}
      </button>
    </form>
  );
}
