import { Badge } from "@/components/ui/Badge";
import {
  ChartIcon,
  HistoryIcon,
  ReceiptIcon,
  StoreIcon,
  TagIcon,
} from "@/components/ui/icons";

const ORDER_ITEMS = [
  { label: "2× Bakso Urat", price: "Rp30.000" },
  { label: "1× Es Teh Manis", price: "Rp5.000" },
];

const NAV_TABS = [
  { label: "Pesanan", icon: ReceiptIcon, active: true },
  { label: "Item", icon: TagIcon, active: false },
  { label: "Riwayat", icon: HistoryIcon, active: false },
  { label: "Laporan", icon: ChartIcon, active: false },
];

/**
 * Mockup HP di hero — statis (tanpa animasi/hover/scroll, biar ringan),
 * meniru layar sungguhan dashboard Pedagang: top bar + satu kartu Pesanan
 * (lihat `MerchantOrderCard.tsx`: Kode Pesanan + `OrderStatusBadge` + daftar
 * Item + satu tombol aksi lebar) + bottom nav 4 tab yang sama persis dengan
 * `DashboardNav.tsx` (Pesanan · Item · Riwayat · Laporan).
 */
export function PhoneMockup() {
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

          <div className="flex flex-col gap-3 rounded-control border border-line bg-surface p-3.5 shadow-card">
            <div className="flex items-center justify-between gap-2">
              <p className="text-lg font-bold tracking-wide tabular-nums text-ink">
                #K3F9
              </p>
              <Badge tone="info">Dibayar</Badge>
            </div>
            <p className="text-sm text-ink-muted">Atas nama Budi</p>
            <ul className="flex flex-col gap-1 border-t border-line pt-3 text-sm">
              {ORDER_ITEMS.map((item) => (
                <li key={item.label} className="flex justify-between gap-2">
                  <span className="text-ink">{item.label}</span>
                  <span className="tabular-nums text-ink-muted">
                    {item.price}
                  </span>
                </li>
              ))}
            </ul>
            <span className="flex h-11 items-center justify-center rounded-control bg-brand-strong text-sm font-semibold text-white">
              Tandai Diproses
            </span>
          </div>

          {/* Placeholder ruang kosong ala layar HP asli, bukan konten aktif. */}
          <div className="h-6" aria-hidden="true" />
        </div>

        {/* Bottom nav — sama persis 4 tab DashboardNav sungguhan. */}
        <div className="flex border-t border-line bg-surface pt-2">
          {NAV_TABS.map((tab) => (
            <span
              key={tab.label}
              className={`flex flex-1 flex-col items-center gap-0.5 pb-2 text-[10px] font-semibold ${tab.active ? "text-brand-strong" : "text-ink-muted"
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
