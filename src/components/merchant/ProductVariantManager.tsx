"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  getProductVariantGroups,
  saveProductVariantGroups,
} from "@/server/product-variants";

// `localId` cuma buat React key (bukan dikirim ke server) — grup/opsi baru
// belum punya id DB, dan replace-all di server tidak butuh id sama sekali.
type EditableOption = { localId: string; name: string; priceDelta: string };
type EditableGroup = {
  localId: string;
  name: string;
  options: EditableOption[];
};

function blankOption(): EditableOption {
  return { localId: crypto.randomUUID(), name: "", priceDelta: "0" };
}

export function ProductVariantManager({
  productId,
  productName,
  onDone,
  onCancel,
}: {
  productId: string;
  productName: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [groups, setGroups] = useState<EditableGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getProductVariantGroups(productId).then((loaded) => {
      if (cancelled) return;
      setGroups(
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
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  function addGroup() {
    setGroups((prev) => [
      ...prev,
      { localId: crypto.randomUUID(), name: "", options: [blankOption()] },
    ]);
  }

  function removeGroup(groupIndex: number) {
    setGroups((prev) => prev.filter((_, i) => i !== groupIndex));
  }

  function updateGroupName(groupIndex: number, name: string) {
    setGroups((prev) =>
      prev.map((group, i) => (i === groupIndex ? { ...group, name } : group)),
    );
  }

  function addOption(groupIndex: number) {
    setGroups((prev) =>
      prev.map((group, i) =>
        i === groupIndex
          ? { ...group, options: [...group.options, blankOption()] }
          : group,
      ),
    );
  }

  function removeOption(groupIndex: number, optionIndex: number) {
    setGroups((prev) =>
      prev.map((group, i) =>
        i === groupIndex
          ? {
              ...group,
              options: group.options.filter((_, j) => j !== optionIndex),
            }
          : group,
      ),
    );
  }

  function updateOption(
    groupIndex: number,
    optionIndex: number,
    field: "name" | "priceDelta",
    value: string,
  ) {
    setGroups((prev) =>
      prev.map((group, i) =>
        i === groupIndex
          ? {
              ...group,
              options: group.options.map((option, j) =>
                j === optionIndex ? { ...option, [field]: value } : option,
              ),
            }
          : group,
      ),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await saveProductVariantGroups({
      productId,
      groups: groups.map((group) => ({
        name: group.name,
        options: group.options.map((option) => ({
          name: option.name,
          priceDelta:
            option.priceDelta.trim() === "" ? 0 : Number(option.priceDelta),
        })),
      })),
    });

    if (!result.ok) {
      setError(result.message ?? "Gagal menyimpan varian.");
      setSubmitting(false);
      return;
    }
    onDone();
  }

  if (loading) {
    return <p className="text-sm text-ink-muted">Memuat...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-ink-muted">
        Atur pilihan varian untuk{" "}
        <span className="font-semibold">{productName}</span> — mis. Level Pedas,
        Ukuran, atau Warna. Kosongkan semua grup untuk menghapus varian dari
        Item ini.
      </p>

      {groups.map((group, groupIndex) => (
        <div
          key={group.localId}
          className="flex flex-col gap-2.5 rounded-control border border-line p-3"
        >
          <div className="flex items-center gap-2">
            <Input
              type="text"
              inputSize="sm"
              value={group.name}
              onChange={(e) => updateGroupName(groupIndex, e.target.value)}
              placeholder="Nama grup, mis. Level Pedas"
              required
              maxLength={50}
            />
            <Button
              type="button"
              variant="dangerOutline"
              size="sm"
              onClick={() => removeGroup(groupIndex)}
            >
              Hapus Grup
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            {group.options.map((option, optionIndex) => (
              <div key={option.localId} className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    type="text"
                    inputSize="sm"
                    value={option.name}
                    onChange={(e) =>
                      updateOption(
                        groupIndex,
                        optionIndex,
                        "name",
                        e.target.value,
                      )
                    }
                    placeholder="Nama pilihan, mis. Pedas"
                    required
                    maxLength={50}
                  />
                </div>
                <div className="w-28">
                  <Input
                    type="number"
                    inputSize="sm"
                    inputMode="numeric"
                    value={option.priceDelta}
                    onChange={(e) =>
                      updateOption(
                        groupIndex,
                        optionIndex,
                        "priceDelta",
                        e.target.value,
                      )
                    }
                    placeholder="+Rp"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeOption(groupIndex, optionIndex)}
                  disabled={group.options.length <= 1}
                  className="text-sm font-semibold text-danger transition-colors hover:text-danger-hover disabled:opacity-40"
                >
                  Hapus
                </button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => addOption(groupIndex)}
          >
            + Tambah Pilihan
          </Button>
        </div>
      ))}

      <Button type="button" variant="secondary" onClick={addGroup}>
        + Tambah Grup Varian
      </Button>

      {error ? <Alert tone="error">{error}</Alert> : null}
      <div className="flex gap-2">
        <Button type="submit" fullWidth loading={submitting}>
          {submitting ? "Menyimpan..." : "Simpan"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Batal
        </Button>
      </div>
    </form>
  );
}
