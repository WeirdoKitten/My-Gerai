"use client";

import { useEffect, useState } from "react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  ChartIcon,
  HistoryIcon,
  ReceiptIcon,
  StoreIcon,
  TagIcon,
} from "@/components/ui/icons";

type OrderStatus = "dibayar" | "diproses" | "siap_diambil" | "selesai";

const STATUS_LABEL: Record<OrderStatus, string> = {
  dibayar: "Dibayar",
  diproses: "Diproses",
  siap_diambil: "Siap Diambil",
  selesai: "Selesai",
};

const STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  dibayar: "info",
  diproses: "info",
  siap_diambil: "success",
  selesai: "neutral",
};

const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  dibayar: "diproses",
  diproses: "siap_diambil",
  siap_diambil: "selesai",
  selesai: null,
};

const ACTION_LABEL: Record<Exclude<OrderStatus, "selesai">, string> = {
  dibayar: "Tandai Diproses",
  diproses: "Tandai Siap Diambil",
  siap_diambil: "Tandai Selesai",
};

const SAMPLE_ORDERS = [
  {
    code: "#K3F9",
    buyer: "Budi",
    items: [
      { label: "2× Bakso Urat", price: "Rp30.000" },
      { label: "1× Es Teh Manis", price: "Rp5.000" },
    ],
  },
  {
    code: "#7QXN",
    buyer: "Sari",
    items: [
      { label: "1× Bakso Jumbo", price: "Rp20.000" },
      { label: "2× Es Teh Manis", price: "Rp10.000" },
    ],
  },
];

const HIDE_AFTER_SELESAI_MS = 700;
const NEXT_ORDER_AFTER_MS = 1100;

const NAV_TABS = [
  { label: "Pesanan", icon: ReceiptIcon, active: true },
  { label: "Item", icon: TagIcon, active: false },
  { label: "Riwayat", icon: HistoryIcon, active: false },
  { label: "Laporan", icon: ChartIcon, active: false },
];

/**
 * Mockup HP di hero — interaktif sungguhan: klik tombol memajukan status
 * Pesanan persis alur asli (`nextMerchantStatus`/`MERCHANT_ACTION_LABEL_ID`,
 * lihat `src/lib/utils/order-status.ts` & `MerchantOrderCard.tsx`). Begitu
 * "Selesai", kartu menghilang lalu Pesanan baru muncul — meniru Pesanan
 * yang pindah ke Riwayat dan Pesanan berikutnya masuk, lalu berulang.
 * Sengaja tanpa `motion/react` (cuma transisi opacity CSS) biar tetap
 * ringan; satu-satunya pemicu perubahan adalah klik User, bukan hover
 * atau scroll otomatis.
 */
export function PhoneMockup() {
  const [orderIndex, setOrderIndex] = useState(0);
  const [status, setStatus] = useState<OrderStatus>("dibayar");
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (visible) return;
    const id = window.setTimeout(() => {
      setOrderIndex((i) => (i + 1) % SAMPLE_ORDERS.length);
      setStatus("dibayar");
      setVisible(true);
    }, NEXT_ORDER_AFTER_MS);
    return () => window.clearTimeout(id);
  }, [visible]);

  function handleAdvance() {
    const next = NEXT_STATUS[status];
    if (!next) return;
    setStatus(next);
    if (next === "selesai") {
      window.setTimeout(() => setVisible(false), HIDE_AFTER_SELESAI_MS);
    }
  }

  const order = SAMPLE_ORDERS[orderIndex];

  return (
    <div className="relative mx-auto w-full max-w-[300px] sm:max-w-[340px] lg:mx-0 lg:ml-auto lg:max-w-[380px]">
      {/* Sorotan lembut di belakang HP — bikin mockup terasa jadi objek
      utama, bukan cuma kartu polos di latar kosong. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 scale-125 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, var(--color-brand-tint) 0%, transparent 65%)",
        }}
      />

      <div className="overflow-hidden rounded-[2.4rem] border border-line bg-surface p-3.5 shadow-[0_1px_2px_rgb(28_25_23_/_0.04),0_32px_60px_-24px_rgb(234_88_12_/_0.28)]">
        <div className="mx-auto mb-2.5 h-1.5 w-12 rounded-full bg-line" />
        <div className="flex flex-col gap-5 rounded-t-[1.7rem] bg-bg p-4 pb-6">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-ink">
              <StoreIcon className="size-4 text-brand" />
              Bakso Pak Budi
            </span>
            <span className="text-xs font-semibold text-ink-muted">
              Pesanan
            </span>
          </div>

          <div
            className={`flex flex-col gap-3 rounded-control border border-line bg-surface p-3.5 shadow-card transition-opacity duration-300 ${
              visible ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-lg font-bold tracking-wide tabular-nums text-ink">
                {order.code}
              </p>
              <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
            </div>
            <p className="text-sm text-ink-muted">Atas nama {order.buyer}</p>
            <ul className="flex flex-col gap-1 border-t border-line pt-3 text-sm">
              {order.items.map((item) => (
                <li key={item.label} className="flex justify-between gap-2">
                  <span className="text-ink">{item.label}</span>
                  <span className="tabular-nums text-ink-muted">
                    {item.price}
                  </span>
                </li>
              ))}
            </ul>
            {/* Tombol tetap dirender (bukan `null`) saat "selesai" — cuma
            disamarkan lewat `invisible`, supaya tinggi kartu tidak berubah
            saat sesaat sebelum menghilang (mockup jangan sampai "mengecil"
            sekejap sebelum Pesanan berikutnya muncul). */}
            <Button
              fullWidth
              disabled={status === "selesai"}
              onClick={handleAdvance}
              className={status === "selesai" ? "invisible" : undefined}
            >
              {status === "selesai"
                ? ACTION_LABEL.siap_diambil
                : ACTION_LABEL[status]}
            </Button>
          </div>

          {/* Placeholder ruang kosong ala layar HP asli, bukan konten aktif. */}
          <div className="h-6" aria-hidden="true" />
        </div>

        {/* Bottom nav — sama persis 4 tab DashboardNav sungguhan. */}
        <div className="flex border-t border-line bg-surface pt-2">
          {NAV_TABS.map((tab) => (
            <span
              key={tab.label}
              className={`flex flex-1 flex-col items-center gap-0.5 pb-2 text-[10px] font-semibold ${
                tab.active ? "text-brand-strong" : "text-ink-muted"
              }`}
            >
              <tab.icon className="size-4" />
              {tab.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
