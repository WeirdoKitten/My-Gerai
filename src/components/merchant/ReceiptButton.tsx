"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PrinterIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import {
  isBluetoothPrintingSupported,
  PrinterCancelledError,
  PrinterError,
  printBytes,
} from "@/lib/printer/bluetooth-printer";
import { cn } from "@/lib/utils/cn";
import {
  buildReceiptLines,
  encodeEscPos,
  RECEIPT_WIDTH,
  type ReceiptLine,
} from "@/lib/utils/receipt";
import { getOrderReceipt } from "@/server/orders";

/**
 * Satu tombol "Struk" di kartu Pesanan lunas: buka pratinjau struk (persis
 * baris yang akan dicetak) + tombol cetak ke printer thermal Bluetooth.
 * Pratinjau tetap berguna tanpa printer — cek isi, atau tunjukkan ke Pembeli.
 */
export function ReceiptButton({
  orderId,
  orderCode,
}: {
  orderId: string;
  orderCode: string;
}) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<ReceiptLine[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOpen() {
    setOpen(true);
    setError(null);
    if (lines) return;
    setLoading(true);
    const result = await getOrderReceipt(orderId);
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setLines(buildReceiptLines(result.receipt));
  }

  async function handlePrint() {
    if (!lines) return;
    setError(null);
    // Cek saat klik (bukan saat render) supaya HTML server & client sama.
    if (!isBluetoothPrintingSupported()) {
      setError(
        "Browser ini belum mendukung printer Bluetooth. Buka dashboard lewat Chrome di Android untuk cetak struk.",
      );
      return;
    }
    setPrinting(true);
    try {
      await printBytes(encodeEscPos(lines));
      showToast(`Struk ${orderCode} dicetak`);
    } catch (caught) {
      if (caught instanceof PrinterCancelledError) return;
      setError(
        caught instanceof PrinterError
          ? caught.message
          : "Gagal mencetak struk. Coba lagi.",
      );
    } finally {
      setPrinting(false);
    }
  }

  return (
    <>
      <Button type="button" variant="secondary" fullWidth onClick={handleOpen}>
        Lihat Struk
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Struk ${orderCode}`}
      >
        <div className="flex flex-col gap-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : lines ? (
            <ReceiptPreview lines={lines} />
          ) : null}
          {error ? <Alert tone="error">{error}</Alert> : null}
          {lines ? (
            <Button
              type="button"
              fullWidth
              loading={printing}
              onClick={handlePrint}
            >
              {printing ? null : <PrinterIcon className="size-5" />}
              {printing ? "Mencetak..." : "Cetak ke Printer"}
            </Button>
          ) : null}
        </div>
      </Modal>
    </>
  );
}

/** Tiruan kertas thermal 58mm — baris & gaya sama persis dengan hasil ESC/POS. */
function ReceiptPreview({ lines }: { lines: ReceiptLine[] }) {
  return (
    <div
      role="img"
      aria-label="Pratinjau struk"
      className="mx-auto overflow-x-auto rounded-control border border-line bg-bg px-3 py-4 font-mono text-[12px] leading-snug text-ink"
    >
      <div style={{ width: `${RECEIPT_WIDTH}ch` }}>
        {lines.map((line, index) => (
          <p
            // biome-ignore lint/suspicious/noArrayIndexKey: baris struk statis, tidak pernah diurut ulang
            key={index}
            className={cn(
              "whitespace-pre",
              line.align === "center" && "text-center",
              line.bold && "font-bold",
              line.tall && "py-0.5 text-[15px]",
            )}
          >
            {line.text}
          </p>
        ))}
      </div>
    </div>
  );
}
