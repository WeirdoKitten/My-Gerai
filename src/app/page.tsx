import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import {
  ArrowRightIcon,
  CartIcon,
  ChartIcon,
  CheckIcon,
  ClockIcon,
  LightbulbIcon,
  QrIcon,
  ReceiptIcon,
  StoreIcon,
  TagIcon,
  WalletIcon,
} from "@/components/ui/icons";
import { Wordmark } from "@/components/ui/Wordmark";

const STEPS = [
  {
    icon: QrIcon,
    title: "Pembeli scan QR Menu",
    text: "Tanpa unduh aplikasi, tanpa daftar akun.",
  },
  {
    icon: CartIcon,
    title: "Pilih Item, bayar QRIS",
    text: "Menu Lapak langsung tampil di HP pembeli.",
  },
  {
    icon: StoreIcon,
    title: "Pesanan masuk ke Pedagang",
    text: "Otomatis muncul begitu pembayaran lunas.",
  },
];

const TRUST_POINTS = [
  "Tanpa install aplikasi",
  "Daftar gratis, tanpa kartu kredit",
  "Pedagang terima 100% harga jual",
];

const MERCHANT_FEATURES = [
  {
    icon: ReceiptIcon,
    title: "Pesanan masuk otomatis",
    text: "Begitu Pembeli bayar QRIS, Pesanan langsung muncul di HP — tanpa dicek manual.",
  },
  {
    icon: TagIcon,
    title: "Kelola Item & stok dari HP",
    text: "Ubah harga, foto, dan status habis/tersedia kapan saja, di mana saja.",
  },
  {
    icon: ChartIcon,
    title: "Laporan Penjualan + Asisten",
    text: "Omzet, Item terlaris, sampai rekomendasi otomatis buat jualan lebih pintar.",
  },
  {
    icon: WalletIcon,
    title: "Tanpa potongan platform",
    text: "Harga jual yang kamu pasang, itu juga yang kamu terima — penuh.",
  },
];

const BUYER_FEATURES = [
  {
    icon: QrIcon,
    title: "Scan, langsung lihat menu",
    text: "Tidak perlu install aplikasi atau bikin akun dulu.",
  },
  {
    icon: CartIcon,
    title: "Pilih Item, bayar QRIS",
    text: "Checkout cepat, bayar pakai QRIS favoritmu.",
  },
  {
    icon: ClockIcon,
    title: "Pantau status real-time",
    text: "Tahu persis kapan Pesanan diproses sampai siap diambil.",
  },
];

const INSIGHT_EXAMPLES = [
  {
    title: 'Stok "Bakso Urat" menipis',
    text: "Laku sekitar 8 porsi/hari minggu ini, siapkan tambahan sebelum kehabisan.",
  },
  {
    title: "Paling ramai jam 12.00–13.00",
    text: "Sekitar 30% Pesanan masuk di jam segini. Pastikan stok & kembalian siap.",
  },
  {
    title: '"Bakso Urat" & "Es Teh Manis" sering dibeli bareng',
    text: "Coba tawarkan sebagai paket hemat — bisa mendorong pembeli ambil dua.",
  },
];

export default function Home() {
  return (
    <>
      <header className="w-full border-b border-line">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Wordmark className="text-lg" />
          <div className="flex items-center gap-2">
            <ButtonLink href="/login" variant="ghost" size="sm">
              Masuk
            </ButtonLink>
            <ButtonLink href="/daftar" variant="primary" size="sm">
              Daftar
            </ButtonLink>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="w-full">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-14 sm:px-8 lg:grid-cols-2 lg:gap-10 lg:py-24">
            <div className="flex flex-col items-start">
              <Badge tone="primary">Untuk Pedagang Kaki Lima</Badge>
              <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-ink lg:text-5xl">
                Terima pesanan lewat QR, tanpa antre panjang.
              </h1>
              <p className="mt-4 max-w-md text-base text-ink-muted lg:text-lg">
                MyGerai bikin Pembeli pesan & bayar QRIS sendiri dari HP
                mereka — Pesanan otomatis masuk ke HP kamu begitu lunas.
              </p>

              <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <ButtonLink href="/daftar" size="md" fullWidth>
                  Daftarkan Lapak — Gratis
                </ButtonLink>
                <ButtonLink
                  href="/login"
                  variant="secondary"
                  size="md"
                  fullWidth
                >
                  Masuk
                </ButtonLink>
              </div>

              <ul className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
                {TRUST_POINTS.map((point) => (
                  <li
                    key={point}
                    className="flex items-center gap-2 text-sm text-ink-muted"
                  >
                    <CheckIcon className="size-4 shrink-0 text-success" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Mockup HP — bukan foto, murni komponen token warna yang sama */}
            <div className="relative mx-auto w-full max-w-[300px] lg:mx-0 lg:ml-auto">
              <div className="rounded-[2rem] border border-line bg-surface p-3 shadow-card">
                <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-line" />
                <div className="flex flex-col gap-3 rounded-[1.4rem] bg-bg p-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-ink">
                      <StoreIcon className="size-4 text-brand" />
                      Bakso Pak Budi
                    </span>
                    <Badge tone="success">Buka</Badge>
                  </div>

                  <div className="flex flex-col gap-2">
                    {[
                      { name: "Bakso Urat", price: "Rp15.000" },
                      { name: "Es Teh Manis", price: "Rp5.000" },
                    ].map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center gap-3 rounded-control border border-line bg-surface p-2.5"
                      >
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-control bg-brand-tint text-brand">
                          <TagIcon className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">
                            {item.name}
                          </p>
                          <p className="text-sm font-bold tabular-nums text-ink">
                            {item.price}
                          </p>
                        </div>
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line text-ink">
                          +
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex h-11 items-center justify-between rounded-full bg-brand-strong px-4 text-sm font-semibold text-white">
                    <span>2 item</span>
                    <span className="inline-flex items-center gap-1.5 tabular-nums">
                      Rp20.000
                      <ArrowRightIcon className="size-4" />
                    </span>
                  </div>
                </div>
              </div>

              <Card
                elevated
                pad="sm"
                className="absolute -bottom-4 -left-4 hidden items-center gap-2 sm:flex"
              >
                <CheckIcon className="size-4 shrink-0 text-success" />
                <span className="text-xs font-semibold text-ink">
                  Pesanan diterima otomatis
                </span>
              </Card>
            </div>
          </div>
        </section>

        {/* Cara kerja */}
        <section className="w-full border-t border-line">
          <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 lg:py-20">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-ink lg:text-3xl">
                Cara kerjanya
              </h2>
              <p className="mt-2 text-ink-muted">
                Tiga langkah, tanpa ribet — buat Pembeli maupun Pedagang.
              </p>
            </div>

            <ol className="mt-10 grid gap-5 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <Card as="li" key={step.title} pad="lg" className="flex gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand">
                    <step.icon className="size-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-ink">
                      {index + 1}. {step.title}
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">{step.text}</p>
                  </div>
                </Card>
              ))}
            </ol>
          </div>
        </section>

        {/* Fitur Pedagang & Pembeli */}
        <section className="w-full border-t border-line">
          <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 lg:py-20">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card pad="lg" className="flex flex-col gap-5">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-control bg-brand-tint text-brand">
                    <StoreIcon className="size-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-ink">
                    Untuk Pedagang
                  </h3>
                </div>
                <ul className="flex flex-col gap-4">
                  {MERCHANT_FEATURES.map((feature) => (
                    <li key={feature.title} className="flex gap-3">
                      <feature.icon className="mt-0.5 size-5 shrink-0 text-brand-strong" />
                      <div>
                        <p className="text-sm font-semibold text-ink">
                          {feature.title}
                        </p>
                        <p className="text-sm text-ink-muted">
                          {feature.text}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card pad="lg" className="flex flex-col gap-5">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-control bg-brand-tint text-brand">
                    <CartIcon className="size-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-ink">
                    Untuk Pembeli
                  </h3>
                </div>
                <ul className="flex flex-col gap-4">
                  {BUYER_FEATURES.map((feature) => (
                    <li key={feature.title} className="flex gap-3">
                      <feature.icon className="mt-0.5 size-5 shrink-0 text-brand-strong" />
                      <div>
                        <p className="text-sm font-semibold text-ink">
                          {feature.title}
                        </p>
                        <p className="text-sm text-ink-muted">
                          {feature.text}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        </section>

        {/* Asisten Rekomendasi */}
        <section className="w-full border-t border-line">
          <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 lg:py-20">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                <div className="inline-flex size-11 items-center justify-center rounded-full bg-brand-tint text-brand">
                  <LightbulbIcon className="size-6" />
                </div>
                <h2 className="mt-4 text-2xl font-bold tracking-tight text-ink lg:text-3xl">
                  Asisten yang bantu kamu jualan lebih pintar
                </h2>
                <p className="mt-3 text-ink-muted">
                  Begitu data Pesanan cukup, MyGerai otomatis kasih
                  rekomendasi — kapan waktunya restock, jam paling ramai,
                  sampai Item yang sering dibeli bareng. Tanpa perlu paham
                  data, tinggal buka Laporan Penjualan.
                </p>
              </div>

              <Card elevated pad="lg" className="flex flex-col gap-3">
                {INSIGHT_EXAMPLES.map((insight) => (
                  <div key={insight.title} className="flex gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand">
                      <LightbulbIcon className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {insight.title}
                      </p>
                      <p className="text-sm text-ink-muted">{insight.text}</p>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        </section>

        {/* CTA penutup */}
        <section className="w-full border-t border-line bg-brand-strong">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-5 px-5 py-16 text-center sm:px-8">
            <h2 className="text-2xl font-bold tracking-tight text-white lg:text-3xl">
              Siap terima pesanan tanpa antre lagi?
            </h2>
            <p className="max-w-md text-white/85">
              Daftarkan Lapak kamu sekarang, tunggu approval Admin, langsung
              bisa jualan.
            </p>
            <ButtonLink href="/daftar" variant="secondary" size="md">
              Daftarkan Lapak — Gratis
            </ButtonLink>
            <a
              href="/login"
              className="text-sm font-semibold text-white/85 underline-offset-4 hover:text-white hover:underline"
            >
              Sudah punya akun? Masuk
            </a>
          </div>
        </section>
      </main>

      <footer className="w-full border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-5 py-8 text-center sm:flex-row sm:justify-between sm:text-left sm:px-8">
          <div>
            <Wordmark />
            <p className="mt-1 text-xs text-ink-muted">
              Pesan lewat scan QR, bayar QRIS, langsung masuk ke Pedagang.
            </p>
          </div>
          <p className="text-xs text-ink-muted">© 2026 MyGerai</p>
        </div>
      </footer>
    </>
  );
}
