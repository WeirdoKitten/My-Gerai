"use client";

import { Input } from "@/components/ui/Input";
import { PlusIcon, TrashIcon, XIcon } from "@/components/ui/icons";

// `localId` cuma buat React key (bukan dikirim ke server) — grup/opsi baru
// belum punya id DB, dan replace-all di server tidak butuh id sama sekali.
export type EditableVariantOption = {
  localId: string;
  name: string;
  priceDelta: string;
};
export type EditableVariantGroup = {
  localId: string;
  name: string;
  options: EditableVariantOption[];
};

function blankOption(): EditableVariantOption {
  return { localId: crypto.randomUUID(), name: "", priceDelta: "0" };
}

export function blankVariantGroup(): EditableVariantGroup {
  return { localId: crypto.randomUUID(), name: "", options: [blankOption()] };
}

/** Konversi state editor jadi input siap kirim ke `saveProductVariantGroups`. */
export function toVariantGroupsInput(groups: EditableVariantGroup[]) {
  return groups.map((group) => ({
    name: group.name,
    options: group.options.map((option) => ({
      name: option.name,
      priceDelta:
        option.priceDelta.trim() === "" ? 0 : Number(option.priceDelta),
    })),
  }));
}

/**
 * Editor grup varian Item — controlled, tidak fetch/submit sendiri. Dipakai
 * inline di dalam `ProductForm` (popup Tambah/Ubah Item) supaya varian
 * tersimpan dalam satu langkah "Simpan" yang sama dengan field Item lainnya.
 */
export function ProductVariantEditor({
  groups,
  onChange,
}: {
  groups: EditableVariantGroup[];
  onChange: (groups: EditableVariantGroup[]) => void;
}) {
  function addGroup() {
    onChange([...groups, blankVariantGroup()]);
  }

  function removeGroup(groupIndex: number) {
    onChange(groups.filter((_, i) => i !== groupIndex));
  }

  function updateGroupName(groupIndex: number, name: string) {
    onChange(
      groups.map((group, i) => (i === groupIndex ? { ...group, name } : group)),
    );
  }

  function addOption(groupIndex: number) {
    onChange(
      groups.map((group, i) =>
        i === groupIndex
          ? { ...group, options: [...group.options, blankOption()] }
          : group,
      ),
    );
  }

  function removeOption(groupIndex: number, optionIndex: number) {
    onChange(
      groups.map((group, i) =>
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
    onChange(
      groups.map((group, i) =>
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

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group, groupIndex) => (
        <div
          key={group.localId}
          className="flex flex-col gap-3 rounded-card border border-line bg-bg/60 p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
              Grup {groupIndex + 1}
            </span>
            <button
              type="button"
              onClick={() => removeGroup(groupIndex)}
              aria-label={`Hapus grup ${group.name || groupIndex + 1}`}
              title="Hapus grup"
              className="-mr-1.5 flex size-9 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-danger-bg hover:text-danger"
            >
              <TrashIcon className="size-4" />
            </button>
          </div>

          <Input
            type="text"
            value={group.name}
            onChange={(e) => updateGroupName(groupIndex, e.target.value)}
            placeholder="Nama grup, contoh: Level Pedas"
            aria-label="Nama grup varian"
            required
            maxLength={50}
          />

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs text-ink-muted">
              <span className="flex-1">Pilihan</span>
              <span className="w-28">Tambahan harga</span>
              <span className="w-9" aria-hidden="true" />
            </div>
            {group.options.map((option, optionIndex) => (
              <div key={option.localId} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <Input
                    type="text"
                    value={option.name}
                    onChange={(e) =>
                      updateOption(
                        groupIndex,
                        optionIndex,
                        "name",
                        e.target.value,
                      )
                    }
                    placeholder="Contoh: Pedas"
                    aria-label={`Nama pilihan ${optionIndex + 1}`}
                    required
                    maxLength={50}
                  />
                </div>
                <div className="w-28 shrink-0">
                  <Input
                    type="number"
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
                    placeholder="0"
                    aria-label={`Tambahan harga pilihan ${optionIndex + 1}`}
                    leftIcon={<span className="text-sm">Rp</span>}
                    className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeOption(groupIndex, optionIndex)}
                  disabled={group.options.length <= 1}
                  aria-label={`Hapus pilihan ${option.name || optionIndex + 1}`}
                  title="Hapus pilihan"
                  className="flex size-9 shrink-0 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-danger-bg hover:text-danger disabled:pointer-events-none disabled:opacity-30"
                >
                  <XIcon className="size-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => addOption(groupIndex)}
            className="flex items-center gap-1.5 self-start rounded-control px-1 py-1 text-sm font-semibold text-brand-strong transition-colors hover:text-brand-strong-hover"
          >
            <PlusIcon className="size-4" />
            Tambah pilihan
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addGroup}
        className="flex h-11 items-center justify-center gap-1.5 rounded-card border-2 border-dashed border-line text-sm font-semibold text-ink-muted transition-colors hover:border-brand hover:text-brand-strong"
      >
        <PlusIcon className="size-4" />
        Tambah grup varian
      </button>
    </div>
  );
}
