import { MerchantShowcase } from "@/components/buyer/MerchantShowcase";
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
import { DownloadQrPosterButton } from "@/components/ui/DownloadQrPosterButton";
import {
  CartIcon,
  ChartIcon,
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  QrIcon,
  ReceiptIcon,
  StoreIcon,
  TagIcon,
  WalletIcon,
} from "@/components/ui/icons";
import { Wordmark } from "@/components/ui/Wordmark";
import { buildRegistrationQrPoster } from "@/lib/utils/qr-poster";
import { listApprovedMerchants } from "@/server/merchants";

// Halaman ini tanpa API dinamis (cookies/headers) jadi Next.js akan
// men-static-generate-nya sekali saat `pnpm build` — di titik itu APP_URL
// belum ada (env Dokploy cuma di-inject saat container start, lihat
// Dockerfile), jadi QR pendaftaran akan ke-bake ke fallback localhost kalau
// tidak dipaksa render per-request seperti ini.
export const dynamic = "force-dynamic";

const NAV_LINKS = [
  { href: "#cara-kerja", label: "Cara Kerja" },
  { href: "#fitur", label: "Fitur" },
  { href: "#asisten", label: "Asisten AI" },
];

const STEPS = [
  {
    icon: QrIcon,
    title: "Scan Kode QR",
    text: "Pembeli cukup arahkan kamera HP ke QR Menu di meja atau gerobak kamu. Menu langsung muncul, tanpa install apa pun.",
  },
  {
    icon: CartIcon,
    title: "Pilih dan Bayar QRIS",
    text: "Pembeli pilih Item favorit, checkout, lalu bayar pakai QRIS apa saja. Semua beres dari HP mereka sendiri.",
  },
  {
    icon: StoreIcon,
    title: "Pesanan Langsung Masuk",
    text: "Begitu pembayaran lunas, Pesanan otomatis muncul di HP kamu. Tinggal proses, tanpa dicek manual satu-satu.",
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
    title: "Pesanan Masuk Otomatis",
    text: "Begitu Pembeli bayar QRIS, Pesanan langsung muncul di HP. Tidak perlu dicek manual satu-satu.",
  },
  {
    icon: TagIcon,
    title: "Kelola Item dan Stok dari HP",
    text: "Ubah harga, foto, sampai status habis atau tersedia kapan saja. Semua dari genggaman tangan.",
  },
  {
    icon: ChartIcon,
    title: "Laporan Plus Asisten Pintar",
    text: "Lihat omzet, Item terlaris, dan rekomendasi otomatis biar strategi jualan kamu makin tajam.",
  },
  {
    icon: WalletIcon,
    title: "Nol Potongan Platform",
    text: "Harga jual yang kamu pasang, itu juga yang kamu terima. Penuh, langsung masuk kantong.",
  },
];

const BUYER_FEATURES = [
  {
    icon: QrIcon,
    title: "Scan, Langsung Lihat Menu",
    text: "Tanpa install aplikasi, tanpa bikin akun. Menu terbuka dalam hitungan detik.",
  },
  {
    icon: CartIcon,
    title: "Pilih dan Bayar QRIS",
    text: "Checkout cepat, bayar pakai QRIS favorit tanpa perlu antre di kasir.",
  },
  {
    icon: ClockIcon,
    title: "Pantau Status Real-Time",
    text: "Tahu persis kapan Pesanan diproses sampai siap diambil, tanpa perlu nanya-nanya.",
  },
];

const INSIGHT_EXAMPLES = [
  {
    title: 'Stok "Bakso Urat" Menipis',
    text: "Laku sekitar 8 porsi sehari minggu ini. Siapkan tambahan sebelum kehabisan di tengah jualan.",
  },
  {
    title: "Paling Ramai Saat Jam Makan Siang",
    text: "Sekitar 30% Pesanan masuk di jam segitu. Pastikan stok dan kembalian sudah siap.",
  },
  {
    title: '"Bakso Urat" Sering Dibeli Bareng Es Teh',
    text: "Coba tawarkan sebagai paket hemat. Peluang bagus buat naikkan nilai tiap Pesanan.",
  },
];

export default async function Home() {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const registerUrl = `${appUrl}/daftar`;
  const [registerQrImageUrl, approvedMerchants] = await Promise.all([
    buildRegistrationQrPoster(registerUrl),
    listApprovedMerchants(),
  ]);

  return (
    <>
      <ScrollProgressBar />
      <CursorGlow />

      {/* Sengaja TANPA <Reveal> (motion.div) di sini — transform pada leluhur
      mematahkan `position: sticky` pada elemen turunannya (gotcha CSS asli,
      bukan cuma soal animasi), jadi header berhenti nempel di atas. */}
      <header className="sticky top-0 z-40 w-full border-b border-line bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Wordmark className="text-lg" />
          <nav className="hidden items-center gap-8 text-sm font-semibold text-ink-muted md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-ink"
              >
                {link.label}
              </a>
            ))}
          </nav>
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

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="relative w-full overflow-hidden">
          <AmbientBlobs />
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:gap-10 lg:py-28">
            <div className="flex flex-col items-start">
              <h1 className="text-5xl font-extrabold leading-[0.98] tracking-tight text-ink sm:text-6xl lg:text-7xl">
                <RevealText text="Pesanan Masuk Sendiri," delay={0.1} />
                <br />
                <RevealText
                  text="Kamu Tinggal Masak."
                  delay={0.1 + 0.35}
                  className="text-brand-strong"
                />
              </h1>

              <Reveal delay={0.75}>
                <p className="mt-5 max-w-md text-base text-ink-muted lg:text-lg">
                  MyGerai bikin Pembeli pesan dan bayar QRIS sendiri dari HP
                  mereka. Begitu lunas, Pesanan otomatis nongol di HP kamu, siap
                  diproses dalam hitungan detik.
                </p>
              </Reveal>

              <Reveal
                delay={0.85}
                className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row"
              >
                <Magnetic className="w-full sm:w-auto">
                  <ButtonLink href="/daftar" size="md" fullWidth>
                    Daftarkan Lapak Sekarang
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

          <Reveal delay={1.3} className="hidden justify-center pb-10 lg:flex">
            <a
              href="#cara-kerja"
              className="flex flex-col items-center gap-1 text-ink-muted transition-colors hover:text-brand-strong"
            >
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                Scroll
              </span>
              <ChevronDownIcon className="size-4 motion-safe:animate-bounce" />
            </a>
          </Reveal>
        </section>

        {/* Cara kerja */}
        <section
          id="cara-kerja"
          className="w-full scroll-mt-20 border-t border-line"
        >
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 lg:py-36">
            <Reveal className="mx-auto max-w-xl text-center">
              <Badge tone="primary">Cara Kerja</Badge>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink lg:text-5xl">
                <RevealText text="Online Dalam 3 Langkah" />
              </h2>
              <p className="mt-4 text-base text-ink-muted lg:text-lg">
                Tiga langkah simpel. Pembeli dan Pedagang sama-sama dimudahkan,
                tanpa pelatihan, tanpa ribet.
              </p>
            </Reveal>

            <ol className="mt-16 grid gap-8 lg:grid-cols-3 lg:gap-10">
              {STEPS.map((step, index) => (
                <Reveal key={step.title} delay={index * 0.15}>
                  <TiltCard
                    pad="lg"
                    className="relative flex h-full flex-col gap-8 py-8"
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-3 -top-8 select-none text-[7rem] font-extrabold leading-none text-brand-tint"
                    >
                      0{index + 1}
                    </span>
                    <div className="relative flex size-14 items-center justify-center rounded-2xl bg-brand-tint text-brand">
                      <step.icon className="size-7" />
                    </div>
                    <div className="relative">
                      <p className="text-xl font-bold text-ink">{step.title}</p>
                      <p className="mt-2.5 text-sm leading-relaxed text-ink-muted">
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
        <section
          id="fitur"
          className="w-full scroll-mt-20 border-t border-line"
        >
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 lg:py-36">
            <Reveal className="mx-auto max-w-xl text-center">
              <Badge tone="primary">Fitur</Badge>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink lg:text-5xl">
                <RevealText text="Semua yang Kamu Butuh" />
              </h2>
              <p className="mt-4 text-base text-ink-muted lg:text-lg">
                Dari terima Pesanan sampai lihat performa Lapak, semua beres
                dalam satu aplikasi ringan.
              </p>
            </Reveal>

            <div className="mt-16 grid gap-6 lg:grid-cols-2 lg:gap-8">
              <Reveal>
                <TiltCard pad="lg" className="flex h-full flex-col gap-9">
                  <div className="border-b border-line pb-6">
                    <h3 className="text-2xl font-bold text-ink">
                      Untuk Pedagang
                    </h3>
                    <p className="mt-1.5 text-sm text-ink-muted">
                      Kelola Lapak dari HP, tanpa ribet.
                    </p>
                  </div>
                  <ul className="flex flex-col gap-5">
                    {MERCHANT_FEATURES.map((feature) => (
                      <li key={feature.title} className="flex gap-3.5">
                        <feature.icon className="mt-0.5 size-5 shrink-0 text-brand-strong" />
                        <div>
                          <p className="font-semibold text-ink">
                            {feature.title}
                          </p>
                          <p className="mt-0.5 text-sm text-ink-muted">
                            {feature.text}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </TiltCard>
              </Reveal>

              <Reveal delay={0.12}>
                <TiltCard pad="lg" className="flex h-full flex-col gap-9">
                  <div className="border-b border-line pb-6">
                    <h3 className="text-2xl font-bold text-ink">
                      Untuk Pembeli
                    </h3>
                    <p className="mt-1.5 text-sm text-ink-muted">
                      Pesan cepat, tanpa install apa pun.
                    </p>
                  </div>
                  <ul className="flex flex-col gap-5">
                    {BUYER_FEATURES.map((feature) => (
                      <li key={feature.title} className="flex gap-3.5">
                        <feature.icon className="mt-0.5 size-5 shrink-0 text-brand-strong" />
                        <div>
                          <p className="font-semibold text-ink">
                            {feature.title}
                          </p>
                          <p className="mt-0.5 text-sm text-ink-muted">
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

        {/* Gerai Terdaftar */}
        {approvedMerchants.length > 0 ? (
          <section className="relative w-full overflow-hidden border-t border-line">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/3 rounded-full opacity-50 blur-3xl"
              style={{
                background:
                  "radial-gradient(circle, var(--color-brand-tint) 0%, transparent 70%)",
              }}
            />
            <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 lg:py-36">
              <Reveal className="mx-auto max-w-2xl text-center">
                <Badge tone="primary">
                  {approvedMerchants.length}+ Gerai Sudah Bergabung
                </Badge>
                <h2 className="mt-4 text-4xl font-bold tracking-tight text-ink lg:text-6xl">
                  <RevealText text="Sudah Jualan di" />
                  <br />
                  <RevealText
                    text="MyGerai"
                    delay={0.3}
                    className="text-brand-strong"
                  />
                </h2>
                <p className="mt-5 text-base text-ink-muted lg:text-lg">
                  Klik salah satu gerai buat intip menunya langsung — lihat
                  sendiri kenapa mereka pindah pesanan online ke MyGerai.
                </p>
              </Reveal>

              <MerchantShowcase merchants={approvedMerchants} />

              <Reveal
                delay={0.2}
                className="mt-16 flex flex-col items-center gap-4 text-center"
              >
                <p className="text-base font-semibold text-ink lg:text-lg">
                  Mau gerai kamu tampil di sini juga?
                </p>
                <Magnetic>
                  <ButtonLink href="/daftar" size="md">
                    Daftarkan Lapak Sekarang
                  </ButtonLink>
                </Magnetic>
              </Reveal>
            </div>
          </section>
        ) : null}

        {/* Asisten Rekomendasi */}
        <section
          id="asisten"
          className="relative w-full scroll-mt-20 overflow-hidden border-t border-line"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-1/2 -z-10 size-[520px] -translate-y-1/2 translate-x-1/3 rounded-full opacity-60 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, var(--color-brand-tint) 0%, transparent 70%)",
            }}
          />
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 lg:py-36">
            <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
              <Reveal>
                <h2 className="text-3xl font-bold tracking-tight text-ink lg:text-5xl">
                  <RevealText text="Asisten AI yang Bantu Kamu" />
                  <br />
                  <RevealText
                    text="Jualan Lebih Pintar"
                    delay={0.3}
                    className="text-brand-strong"
                  />
                </h2>
                <p className="mt-5 text-base text-ink-muted lg:text-lg">
                  Begitu data Pesanan cukup, MyGerai otomatis kasih rekomendasi:
                  kapan waktunya restock, jam paling ramai, sampai Item yang
                  sering dibeli bareng.
                </p>
                <p className="mt-3 text-base text-ink-muted lg:text-lg">
                  Tidak perlu paham data. Cukup buka Laporan Penjualan, dan
                  biarkan Asisten yang mikirin strategi buat kamu.
                </p>
              </Reveal>

              <div className="flex flex-col gap-5">
                {INSIGHT_EXAMPLES.map((insight, i) => (
                  <Reveal key={insight.title} delay={0.15 + i * 0.12}>
                    <TiltCard pad="lg" className="flex flex-col gap-2.5">
                      <span className="text-xs font-bold uppercase tracking-wide text-brand-strong">
                        Rekomendasi {i + 1}
                      </span>
                      <p className="text-base font-semibold text-ink">
                        {insight.title}
                      </p>
                      <p className="text-sm leading-relaxed text-ink-muted">
                        {insight.text}
                      </p>
                    </TiltCard>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA penutup */}
        <section className="relative w-full overflow-hidden border-t border-line bg-brand-strong">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(120deg,transparent_30%,rgb(255_255_255_/_0.08)_50%,transparent_70%)] bg-[length:200%_100%] motion-safe:animate-[shimmer_6s_ease-in-out_infinite]"
          />
          <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center gap-5 px-5 py-20 text-center sm:px-8 lg:py-32">
            <Reveal>
              <h2 className="text-3xl font-bold tracking-tight text-white lg:text-5xl">
                <RevealText text="Siap Terima Pesanan" />
                <br />
                <RevealText text="Tanpa Antre Lagi?" delay={0.3} />
              </h2>
            </Reveal>
            <Reveal delay={0.25}>
              <p className="max-w-md text-white/85 lg:text-lg">
                Daftarkan Lapak kamu sekarang, tunggu approval Admin, langsung
                bisa jualan hari ini juga.
              </p>
            </Reveal>
            <Reveal delay={0.4} className="flex flex-col items-center gap-4">
              <Magnetic>
                <ButtonLink href="/daftar" variant="secondary" size="md">
                  Daftarkan Lapak Sekarang
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

        {/* Ajak Pedagang Lain */}
        <section className="w-full border-t border-line">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 lg:py-32">
            <Reveal className="mx-auto max-w-xl text-center">
              <Badge tone="primary">Ajak Pedagang Lain</Badge>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink lg:text-5xl">
                <RevealText text="Kenalkan MyGerai ke" />
                <br />
                <RevealText
                  text="Pedagang di Sekitarmu"
                  delay={0.3}
                  className="text-brand-strong"
                />
              </h2>
              <p className="mt-4 text-base text-ink-muted lg:text-lg">
                Cetak QR ini dan tempel di warung tetangga, pasar, atau
                komunitas pedagang kamu. Mereka tinggal scan, isi data, langsung
                bisa jualan online hari itu juga.
              </p>
            </Reveal>

            <Reveal
              delay={0.2}
              className="mx-auto mt-12 flex max-w-xs flex-col items-center gap-5"
            >
              {/* biome-ignore lint/performance/noImgElement: data URI, next/image tidak berlaku */}
              <img
                src={registerQrImageUrl}
                alt="Poster QR Pendaftaran Pedagang MyGerai"
                className="w-full drop-shadow-xl"
              />
              <Magnetic className="w-full">
                <DownloadQrPosterButton
                  svgDataUrl={registerQrImageUrl}
                  filename="qr-daftar-pedagang.png"
                  label="Unduh QR Pendaftaran"
                />
              </Magnetic>
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
