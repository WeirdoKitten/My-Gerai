"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { OrderReviewSection } from "@/components/buyer/OrderReviewSection";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  MapPinIcon,
} from "@/components/ui/icons";
import { OrderStatusBadge } from "@/components/ui/OrderStatusBadge";
import { rememberRecentOrder } from "@/lib/buyer/storage";
import { formatSchedule } from "@/lib/utils/datetime";
import { formatRupiah } from "@/lib/utils/money";
import {
  DELIVERY_FAILURE_REASON_LABEL_ID,
  FINAL_ORDER_STATUSES,
} from "@/lib/utils/order-status";
import {
  getOrderStatus,
  getOrderStatusSummary,
  simulatePaymentSuccess,
} from "@/server/orders";
import type { BuyerOrderStatusView } from "@/types/order";

const POLL_INTERVAL_MS = 4000;

/** Tebak ekstensi file dari URL gambar atau, kalau tidak ada di URL (data URI), dari MIME type hasil fetch. */
function guessQrExtension(url: string, mimeType: string): string {
  const fromUrl = url.match(/\.(png|jpe?g|webp)(?:[?#]|$)/i)?.[1];
  if (fromUrl) return fromUrl.toLowerCase();
  const fromMime = mimeType.split("/")[1];
  return fromMime === "jpeg" ? "jpg" : (fromMime ?? "png");
}

export function OrderStatusView({
  initialOrder,
}: {
  initialOrder: BuyerOrderStatusView;
}) {
  const [order, setOrder] = useState(initialOrder);
  const [simulating, setSimulating] = useState(false);
  const [simulateError, setSimulateError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const orderIdRef = useRef(initialOrder.id);

  // Simpan di "Pesanan Saya" (localStorage) supaya link status tidak hilang
  // kalau tab tertutup — lihat halaman /lacak.
  useEffect(() => {
    rememberRecentOrder({
      orderId: initialOrder.id,
      orderCode: initialOrder.orderCode,
      stallName: initialOrder.stallName,
      createdAt: new Date(initialOrder.createdAt).toISOString(),
    });
  }, [initialOrder]);

  useEffect(() => {
    if (FINAL_ORDER_STATUSES.includes(order.status)) return;

    // Poll versi ringan (status saja); data lengkap + QR diambil ulang hanya
    // saat status berubah — lihat docs/STRESS-TEST.md P1-4.
    const interval = window.setInterval(async () => {
      const summary = await getOrderStatusSummary(orderIdRef.current);
      if (!summary || summary.status === order.status) return;
      const latest = await getOrderStatus(orderIdRef.current);
      if (latest) setOrder(latest);
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [order.status]);

  async function handleSimulate() {
    setSimulating(true);
    setSimulateError(null);
    const result = await simulatePaymentSuccess(order.id);
    if (!result.ok) {
      setSimulateError(result.message ?? "Simulasi pembayaran gagal.");
    }
    const latest = await getOrderStatus(order.id);
    if (latest) setOrder(latest);
    setSimulating(false);
  }

  async function handleDownloadQr() {
    const url = order.qrImageUrl;
    if (!url) return;

    setDownloading(true);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const ext = guessQrExtension(url, blob.type);
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `qris-${order.orderCode}.${ext}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Gagal (mis. gambar lintas-domain tanpa CORS) — buka di tab baru
      // supaya Pembeli tetap bisa simpan manual (tekan lama/klik kanan).
      window.open(url, "_blank");
    }
    setDownloading(false);
  }

  return (
    <div className="flex flex-col gap-4">
      {order.qrImageUrl ? (
        <Card pad="lg" className="flex flex-col items-center gap-3">
          <p className="text-center text-sm text-ink-muted">
            {order.isQrisPribadi
              ? "Pindai QRIS Pedagang untuk membayar"
              : order.canSimulate
                ? "Pindai untuk bayar (simulasi)"
                : "Pindai dengan aplikasi apa pun yang mendukung QRIS"}
          </p>
          {/* biome-ignore lint/performance/noImgElement: data URI/foto unggahan, next/image tidak berlaku */}
          <img
            src={order.qrImageUrl}
            alt="QR pembayaran"
            className="h-auto w-full max-w-xs rounded-control object-contain"
          />
          <Button
            type="button"
            variant="secondary"
            fullWidth
            loading={downloading}
            onClick={handleDownloadQr}
          >
            {downloading ? (
              "Mengunduh..."
            ) : (
              <>
                <DownloadIcon className="size-4" />
                Unduh Gambar QR
              </>
            )}
          </Button>
          {order.canSimulate ? (
            <>
              <Button
                type="button"
                fullWidth
                loading={simulating}
                onClick={handleSimulate}
              >
                {simulating
                  ? "Memproses..."
                  : "Simulasikan Pembayaran Berhasil"}
              </Button>
              {simulateError ? (
                <Alert tone="error">{simulateError}</Alert>
              ) : null}
            </>
          ) : (
            <p className="text-center text-xs text-ink-muted">
              {order.isQrisPribadi
                ? "Pedagang akan menandai Pesanan ini lunas setelah menerima pembayaran."
                : "Halaman ini otomatis diperbarui setelah pembayaran diterima."}
            </p>
          )}
        </Card>
      ) : null}

      <Card pad="lg" className="flex flex-col items-center gap-2 text-center">
        <p className="text-sm text-ink-muted">Kode Pesanan</p>
        <p className="text-3xl font-extrabold tracking-[0.15em] tabular-nums text-ink">
          {order.orderCode}
        </p>
        <OrderStatusBadge status={order.status} />
        <CopyOrderCode orderCode={order.orderCode} />
      </Card>

      {order.status === "selesai" ? (
        <OrderReviewSection
          orderId={order.id}
          stallName={order.stallName}
          initialReview={order.review}
        />
      ) : null}

      {order.scheduledFor ? (
        <Card className="flex flex-col gap-1 text-sm">
          <p className="font-semibold text-ink">
            Pre-order ·{" "}
            {order.fulfillmentMethod === "antar" ? "Diantar" : "Diambil"}{" "}
            {formatSchedule(new Date(order.scheduledFor))}
          </p>
          <p className="text-ink-muted">
            Pesananmu dibuat khusus dan siap pada jadwal di atas. Simpan Kode
            Pesanan untuk ditunjukkan ke Pedagang.
          </p>
        </Card>
      ) : null}

      {order.delivery ? (
        <Card className="flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <MapPinIcon className="mt-0.5 size-4 shrink-0 text-brand-strong" />
            <div className="flex flex-col gap-0.5 text-sm">
              <p className="font-semibold text-ink">Diantar ke</p>
              <p className="text-ink">{order.delivery.address}</p>
              {order.delivery.landmark ? (
                <p className="text-ink-muted">
                  Patokan: {order.delivery.landmark}
                </p>
              ) : null}
            </div>
          </div>
          {order.status === "sedang_diantar" ? (
            <Alert tone="info">
              Pesananmu sedang diantar. Siapkan Kode Pesanan untuk ditunjukkan
              ke Pedagang.
            </Alert>
          ) : null}
          {order.status === "gagal_diantar" ? (
            <Alert tone="error">
              Pengantaran gagal
              {order.delivery.failureReason
                ? `: ${DELIVERY_FAILURE_REASON_LABEL_ID[order.delivery.failureReason]}`
                : ""}
              {order.delivery.failureNote
                ? ` (${order.delivery.failureNote})`
                : ""}
              . Pedagang akan menghubungimu lewat nomor HP yang kamu isi.
            </Alert>
          ) : null}
        </Card>
      ) : null}

      {order.sandboxQrUrl ? (
        <Card className="flex items-center gap-2">
          <code className="min-w-0 flex-1 break-all rounded-control bg-bg p-2 text-xs text-ink">
            {order.sandboxQrUrl}
          </code>
          <CopyButton value={order.sandboxQrUrl} label="link QRIS sandbox" />
        </Card>
      ) : null}

      <Card className="flex flex-col gap-3">
        <div>
          <p className="font-semibold text-ink">{order.stallName}</p>
          <p className="text-sm text-ink-muted">Atas nama {order.buyerName}</p>
        </div>
        <ul className="flex flex-col gap-1.5 border-t border-line pt-3">
          {order.items.map((item) => (
            <li key={item.id} className="flex flex-col gap-0.5 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-ink">
                  {item.qty}× {item.productNameSnapshot}
                </span>
                <span className="tabular-nums text-ink-muted">
                  {formatRupiah(item.priceSnapshot * item.qty)}
                </span>
              </div>
              {item.variantSelections.length > 0 ? (
                <p className="text-xs text-ink-muted">
                  {item.variantSelections
                    .map(
                      (s) => `${s.groupNameSnapshot}: ${s.optionNameSnapshot}`,
                    )
                    .join(" · ")}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-1 border-t border-line pt-3">
          <div className="flex justify-between text-sm text-ink-muted">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatRupiah(order.subtotal)}</span>
          </div>
          {order.isQrisPribadi ? null : (
            <div className="flex justify-between text-sm text-ink-muted">
              <span>Biaya Layanan</span>
              <span className="tabular-nums">
                {formatRupiah(order.platformFeeSnapshot)}
              </span>
            </div>
          )}
          {order.deliveryFeeSnapshot > 0 ? (
            <div className="flex justify-between text-sm text-ink-muted">
              <span>Ongkir</span>
              <span className="tabular-nums">
                {formatRupiah(order.deliveryFeeSnapshot)}
              </span>
            </div>
          ) : null}
          <div className="mt-1 flex justify-between border-t border-line pt-2 font-bold text-ink">
            <span>Total Dibayar</span>
            <span className="tabular-nums">
              {formatRupiah(order.amountToPay)}
            </span>
          </div>
        </div>
      </Card>

      <p className="text-center text-xs text-ink-muted">
        Mau cek pesanan ini lagi nanti? Buka{" "}
        <Link href="/lacak" className="font-semibold text-brand-strong">
          Lacak Pesanan
        </Link>{" "}
        lalu masukkan Kode Pesanan di atas.
      </p>
    </div>
  );
}

/**
 * Salin Kode Pesanan — Pembeli tanpa akun, jadi kode inilah "kunci" untuk
 * membuka pesanan lagi di halaman Lacak Pesanan kalau link/riwayat browser
 * hilang. `navigator.clipboard` hanya ada di HTTPS/localhost; fallback
 * `execCommand("copy")` untuk akses lewat HTTP biasa (mis. uji di HP via IP LAN).
 */
function CopyOrderCode({ orderCode }: { orderCode: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(orderCode);
      ok = true;
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = orderCode;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      ok = document.execCommand("copy");
      textarea.remove();
    }
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="mt-1 flex flex-col items-center gap-1.5">
      <Button type="button" variant="secondary" size="sm" onClick={handleCopy}>
        {copied ? (
          <>
            <CheckIcon className="size-4" />
            Kode tersalin
          </>
        ) : (
          <>
            <CopyIcon className="size-4" />
            Salin Kode Pesanan
          </>
        )}
      </Button>
      <p className="max-w-xs text-xs text-ink-muted">
        Jangan lupa untuk simpan/salin kode ini. Kalau riwayat browser terhapus,
        pesananmu tetap bisa dibuka lewat Lacak Pesanan dengan kode ini.
      </p>
    </div>
  );
}
