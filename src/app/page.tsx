import { AmbientBlobs } from "@/components/landing/AmbientBlobs";
import { CursorGlow } from "@/components/landing/CursorGlow";
import { Magnetic } from "@/components/landing/Magnetic";
import { PhoneMockup } from "@/components/landing/PhoneMockup";
import { Reveal } from "@/components/landing/Reveal";
import { RevealText } from "@/components/landing/RevealText";
import { ScrollProgressBar } from "@/components/landing/ScrollProgressBar";
import { TiltCard } from "@/components/landing/TiltCard";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import {
  CartIcon,
  ChartIcon,
  CheckIcon,
  ChevronDownIcon,
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
      <ScrollProgressBar />
      <CursorGlow />

      <Reveal duration={0.5} y={-12}>
        <header className="w-full border-b border-line">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
            <Wordmark className="text-lg" />
            <div className="flex items-center gap-2">
              <ButtonLink href="/login" variant="ghost" size="sm">
                Masuk
              </ButtonLink>
              <Magnetic>
                <ButtonLink href="/daftar" variant="primary" size="sm">
                  Daftar
                </ButtonLink>
              </Magnetic>
            </div>
          </div>
        </header>
      </Reveal>

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="relative w-full overflow-hidden">
          <AmbientBlobs />
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-14 sm:px-8 lg:grid-cols-2 lg:gap-10 lg:py-28">
            <div className="flex flex-col items-start">
              <Reveal delay={0.05}>
                <Badge tone="primary">Untuk Pedagang Kaki Lima</Badge>
              </Reveal>

              <h1 className="mt-5 text-5xl font-extrabold leading-[0.98] tracking-tight text-ink sm:text-6xl lg:text-7xl">
                <RevealText text="Terima pesanan lewat QR," delay={0.1} />
                <br />
                <RevealText
                  text="tanpa antre panjang."
                  delay={0.1 + 0.35}
                  className="text-brand-strong"
                />
              </h1>

              <Reveal delay={0.75}>
                <p className="mt-5 max-w-md text-base text-ink-muted lg:text-lg">
                  MyGerai bikin Pembeli pesan & bayar QRIS sendiri dari HP
                  mereka — Pesanan otomatis masuk ke HP kamu begitu lunas.
                </p>
              </Reveal>

              <Reveal
                delay={0.85}
                className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row"
              >
                <Magnetic className="w-full sm:w-auto">
                  <ButtonLink href="/daftar" size="md" fullWidth>
                    Daftarkan Lapak — Gratis
                  </ButtonLink>
                </Magnetic>
                <Magnetic className="w-full sm:w-auto">
                  <ButtonLink
                    href="/login"
                    variant="secondary"
                    size="md"
                    fullWidth
                  >
                    Masuk
                  </ButtonLink>
                </Magnetic>
              </Reveal>

              <ul className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
                {TRUST_POINTS.map((point, i) => (
                  <Reveal
                    key={point}
                    delay={0.95 + i * 0.08}
                    y={12}
                    duration={0.5}
                  >
                    <li className="flex items-center gap-2 text-sm text-ink-muted">
                      <CheckIcon className="size-4 shrink-0 text-success" />
                      {point}
                    </li>
                  </Reveal>
                ))}
              </ul>
            </div>

            <PhoneMockup />
          </div>

          <Reveal
            delay={1.3}
            className="hidden justify-center pb-10 lg:flex"
          >
            <div className="flex flex-col items-center gap-1 text-ink-muted">
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                Scroll
              </span>
              <ChevronDownIcon className="size-4 motion-safe:animate-bounce" />
            </div>
          </Reveal>
        </section>

        {/* Cara kerja */}
        <section className="w-full border-t border-line">
          <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 lg:py-24">
            <Reveal className="mx-auto max-w-xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-ink lg:text-4xl">
                <RevealText text="Cara kerjanya" />
              </h2>
              <p className="mt-3 text-ink-muted">
                Tiga langkah, tanpa ribet — buat Pembeli maupun Pedagang.
              </p>
            </Reveal>

            <ol className="mt-10 grid gap-5 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <Reveal key={step.title} delay={index * 0.12}>
                  <TiltCard className="flex h-full gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand">
                      <step.icon className="size-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-ink">
                        {index + 1}. {step.title}
                      </p>
                      <p className="mt-1 text-sm text-ink-muted">
                        {step.text}
                      </p>
                    </div>
                  </TiltCard>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* Fitur Pedagang & Pembeli */}
        <section className="w-full border-t border-line">
          <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 lg:py-24">
            <div className="grid gap-6 lg:grid-cols-2">
              <Reveal>
                <TiltCard className="flex h-full flex-col gap-5">
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
                </TiltCard>
              </Reveal>

              <Reveal delay={0.12}>
                <TiltCard className="flex h-full flex-col gap-5">
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
                </TiltCard>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Asisten Rekomendasi */}
        <section className="w-full border-t border-line">
          <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 lg:py-24">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <Reveal>
                <div className="inline-flex size-11 items-center justify-center rounded-full bg-brand-tint text-brand">
                  <LightbulbIcon className="size-6" />
                </div>
                <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink lg:text-4xl">
                  <RevealText text="Asisten yang bantu kamu" />
                  <br />
                  <RevealText text="jualan lebih pintar" delay={0.3} />
                </h2>
                <p className="mt-4 text-ink-muted">
                  Begitu data Pesanan cukup, MyGerai otomatis kasih
                  rekomendasi — kapan waktunya restock, jam paling ramai,
                  sampai Item yang sering dibeli bareng. Tanpa perlu paham
                  data, tinggal buka Laporan Penjualan.
                </p>
              </Reveal>

              <Reveal delay={0.15}>
                <TiltCard elevated className="flex flex-col gap-3">
                  {INSIGHT_EXAMPLES.map((insight, i) => (
                    <Reveal
                      key={insight.title}
                      delay={0.3 + i * 0.12}
                      y={14}
                      duration={0.5}
                    >
                      <div className="flex gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand">
                          <LightbulbIcon className="size-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-ink">
                            {insight.title}
                          </p>
                          <p className="text-sm text-ink-muted">
                            {insight.text}
                          </p>
                        </div>
                      </div>
                    </Reveal>
                  ))}
                </TiltCard>
              </Reveal>
            </div>
          </div>
        </section>

        {/* CTA penutup */}
        <section className="relative w-full overflow-hidden border-t border-line bg-brand-strong">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(120deg,transparent_30%,rgb(255_255_255_/_0.08)_50%,transparent_70%)] bg-[length:200%_100%] motion-safe:animate-[shimmer_6s_ease-in-out_infinite]"
          />
          <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center gap-5 px-5 py-16 text-center sm:px-8 lg:py-24">
            <Reveal>
              <h2 className="text-3xl font-bold tracking-tight text-white lg:text-4xl">
                <RevealText text="Siap terima pesanan" />
                <br />
                <RevealText text="tanpa antre lagi?" delay={0.3} />
              </h2>
            </Reveal>
            <Reveal delay={0.25}>
              <p className="max-w-md text-white/85">
                Daftarkan Lapak kamu sekarang, tunggu approval Admin, langsung
                bisa jualan.
              </p>
            </Reveal>
            <Reveal
              delay={0.4}
              className="flex flex-col items-center gap-4"
            >
              <Magnetic>
                <ButtonLink href="/daftar" variant="secondary" size="md">
                  Daftarkan Lapak — Gratis
                </ButtonLink>
              </Magnetic>
              <a
                href="/login"
                className="text-sm font-semibold text-white/85 underline-offset-4 hover:text-white hover:underline"
              >
                Sudah punya akun? Masuk
              </a>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="w-full border-t border-line">
        <Reveal className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-5 py-8 text-center sm:flex-row sm:justify-between sm:px-8 sm:text-left">
          <div>
            <Wordmark />
            <p className="mt-1 text-xs text-ink-muted">
              Pesan lewat scan QR, bayar QRIS, langsung masuk ke Pedagang.
            </p>
          </div>
          <p className="text-xs text-ink-muted">© 2026 MyGerai</p>
        </Reveal>
      </footer>
    </>
  );
}
