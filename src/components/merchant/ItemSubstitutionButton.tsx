"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PillOption } from "@/components/ui/PillOption";
import { formatRupiah } from "@/lib/utils/money";
import { setOrderItemSubstitution } from "@/server/orders";
import type { MerchantOrderItemView } from "@/types/order";

type Choice = "sesuai" | "diganti" | "tidak_tersedia";

/**
 * Tombol "Item habis?" per Item Pesanan Gerai Titipan + Modal pilihan:
 * diganti barang serupa (seharga atau lebih mahal) atau tidak tersedia
 * (uang Item dikembalikan manual saat serah terima). Tidak mengubah uang
 * di sistem — hanya mencatat supaya Pembeli & EO tahu.
 */
export function ItemSubstitutionButton({
  orderId,
  item,
  onDone,
}: {
  orderId: string;
  item: MerchantOrderItemView;
  onDone: () => void;
}) {
  const current: Choice = item.substitution?.kind ?? "sesuai";
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<Choice>(current);
  const [substituteName, setSubstituteName] = useState(
    item.substitution?.kind === "diganti"
      ? item.substitution.substituteName
      : "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openModal() {
    setChoice(current === "sesuai" ? "diganti" : current);
    setError(null);
    setOpen(true);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const result = await setOrderItemSubstitution({
      orderId,
      orderItemId: item.id,
      kind: choice === "sesuai" ? null : choice,
      substituteName: choice === "diganti" ? substituteName : undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message ?? "Gagal menyimpan.");
      return;
    }
    setOpen(false);
    onDone();
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="self-start text-xs font-semibold text-brand-strong"
      >
        {current === "sesuai" ? "Item habis?" : "Ubah penggantian"}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`${item.qty}× ${item.productNameSnapshot}`}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <PillOption
              selected={choice === "diganti"}
              onClick={() => setChoice("diganti")}
            >
              Ganti barang serupa
            </PillOption>
            <PillOption
              selected={choice === "tidak_tersedia"}
              onClick={() => setChoice("tidak_tersedia")}
            >
              Tidak tersedia
            </PillOption>
            {current !== "sesuai" ? (
              <PillOption
                selected={choice === "sesuai"}
                onClick={() => setChoice("sesuai")}
              >
                Sesuai pesanan
              </PillOption>
            ) : null}
          </div>
          {choice === "diganti" ? (
            <Field
              label="Nama barang pengganti"
              hint="Pengganti harus seharga atau lebih mahal. Selisihnya ditanggung kamu."
            >
              <Input
                value={substituteName}
                onChange={(e) => setSubstituteName(e.target.value)}
                maxLength={100}
                placeholder="Contoh: Keripik Pedas 250 g"
              />
            </Field>
          ) : null}
          {choice === "tidak_tersedia" ? (
            <p className="text-sm text-ink-muted">
              Kembalikan{" "}
              <span className="font-semibold text-ink">
                {formatRupiah(item.priceSnapshot * item.qty)}
              </span>{" "}
              ke Pembeli (tunai atau transfer) saat serah terima. Pembeli
              melihat keterangan ini di halaman Pesanannya.
            </p>
          ) : null}
          {error ? <Alert tone="error">{error}</Alert> : null}
          <Button
            type="button"
            fullWidth
            loading={submitting}
            onClick={handleSubmit}
          >
            {submitting ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
