"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

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

      <Button type="button" variant="secondary" size="sm" onClick={addGroup}>
        + Tambah Grup Varian
      </Button>
    </div>
  );
}
