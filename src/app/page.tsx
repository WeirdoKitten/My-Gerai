import { MerchantShowcase } from "@/components/buyer/MerchantShowcase";
import { AmbientBlobs } from "@/components/landing/AmbientBlobs";
import { BackgroundPattern } from "@/components/landing/BackgroundPattern";
import { PhoneMockup } from "@/components/landing/PhoneMockup";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { DownloadQrPosterButton } from "@/components/ui/DownloadQrPosterButton";
import {
  CartIcon,
  ChartIcon,
  ClockIcon,
  QrIcon,
  ReceiptIcon,
  StoreIcon,
  TagIcon,
  WalletIcon,
} from "@/components/ui/icons";
import { buildRegistrationQrPoster } from "@/lib/utils/qr-poster";
import { listApprovedMerchants } from "@/server/merchants";

// Halaman ini tanpa API dinamis (cookies/headers) jadi Next.js akan
// men-static-generate-nya sekali saat `pnpm build` — di titik itu APP_URL
// belum ada (env Dokploy cuma di-inject saat container start, lihat
// Dockerfile), jadi QR pendaftaran akan ke-bake ke fallback localhost kalau
// tidak dipaksa render per-request seperti ini.
export const dynamic = "force-dynamic";

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
    label: "Peringatan Stok",
    title: 'Stok "Bakso Urat" Menipis',
    text: "Laku sekitar 8 porsi sehari minggu ini. Siapkan tambahan sebelum kehabisan di tengah jualan.",
  },
  {
    label: "Pola Jam Ramai",
    title: "Paling Ramai Saat Jam Makan Siang",
    text: "Sekitar 30% Pesanan masuk di jam segitu. Pastikan stok dan kembalian sudah siap.",
  },
  {
    label: "Peluang Bundling",
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
      <BackgroundPattern />
      <SiteHeader />

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="relative w-full overflow-hidden">
          <AmbientBlobs />
          <div className="mx-auto grid w-full max-w-6xl items-start gap-12 px-5 pt-10 pb-16 sm:px-8 lg:grid-cols-2 lg:gap-10 lg:pt-10 lg:pb-24">
            <div className="flex flex-col items-start pt-8">
              <h1 className="text-5xl font-extrabold leading-[0.98] tracking-tight text-ink sm:text-6xl lg:text-7xl">
                Pesanan Masuk Sendiri,
                <br />
                <span className="text-brand-strong">Kamu Tinggal Siapin.</span>
              </h1>

              <p className="mt-5 max-w-md text-base text-ink-muted lg:text-lg">
                MyGerai bikin pembeli pesan dan bayar sendiri dari HP mereka.
                Begitu lunas, Pesanan otomatis nongol di HP kamu, siap diproses
                dalam hitungan detik.
              </p>
            </div>

            <PhoneMockup />
          </div>
        </section>

        {/* Cara kerja */}
        <section
          id="cara-kerja"
          className="w-full scroll-mt-20 border-t border-line"
        >
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 lg:py-36">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-ink lg:text-5xl">
                Online Dalam 3 Langkah
              </h2>
              <p className="mt-4 text-base text-ink-muted lg:text-lg">
                Tiga langkah simpel. Pembeli dan Pedagang sama-sama dimudahkan,
                tanpa pelatihan, tanpa ribet.
              </p>
            </div>

            <ol className="mt-16 grid gap-8 lg:grid-cols-3 lg:gap-10">
              {STEPS.map((step, index) => (
                <li key={step.title}>
                  <Card
                    pad="lg"
                    className="relative flex h-full flex-col gap-8 overflow-hidden py-8"
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute right-4 top-4 select-none text-5xl font-extrabold leading-none text-brand-tint"
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
                  </Card>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Gerai Terdaftar — bukti sosial ditaruh sebelum daftar fitur supaya
        pengunjung yang masih ragu lihat dulu bahwa Lapak lain sudah pindah,
        sebelum dijelaskan detail fiturnya. */}
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
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-4xl font-bold tracking-tight text-ink lg:text-6xl">
                  {approvedMerchants.length}+ Gerai Sudah
                  <br />
                  <span className="text-brand-strong">
                    Berhenti Ribet Manual
                  </span>
                </h2>
                <p className="mt-5 text-base text-ink-muted lg:text-lg">
                  Klik salah satu buat intip menunya langsung, lihat sendiri
                  kenapa mereka pindah dari catatan manual ke MyGerai.
                </p>
              </div>

              <MerchantShowcase
                merchants={approvedMerchants}
                mobileLimit={3}
                desktopLimit={6}
              />

              <div className="mt-10 flex justify-center">
                <ButtonLink href="/gerai" variant="secondary" size="sm">
                  Lihat Semua Gerai
                </ButtonLink>
              </div>
            </div>
          </section>
        ) : null}

        {/* Fitur Pedagang & Pembeli */}
        <section
          id="fitur"
          className="w-full scroll-mt-20 border-t border-line"
        >
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 lg:py-36">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-ink lg:text-5xl">
                Semua yang Kamu Butuh
              </h2>
              <p className="mt-4 text-base text-ink-muted lg:text-lg">
                Dari terima Pesanan sampai lihat performa Lapak, semua beres
                dalam satu aplikasi ringan.
              </p>
            </div>

            <div className="mt-16 grid gap-6 lg:grid-cols-2 lg:gap-8">
              <Card pad="lg" className="flex h-full flex-col pb-10">
                <div className="border-b border-line pb-6">
                  <h3 className="text-2xl font-bold text-ink">
                    Untuk Pedagang
                  </h3>
                  <p className="mt-1.5 text-sm text-ink-muted">
                    Kelola Lapak dari HP, tanpa ribet.
                  </p>
                </div>
                <ul className="mt-5 flex flex-col gap-5">
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
              </Card>

              <Card pad="lg" className="flex h-full flex-col pb-10">
                <div className="border-b border-line pb-6">
                  <h3 className="text-2xl font-bold text-ink">Untuk Pembeli</h3>
                  <p className="mt-1.5 text-sm text-ink-muted">
                    Pesan cepat, tanpa install apa pun.
                  </p>
                </div>
                <ul className="mt-5 flex flex-col gap-5">
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
              </Card>
            </div>
          </div>
        </section>

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
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-ink lg:text-5xl">
                  <span className="text-brand-strong">Asisten</span> Bantu Kamu
                  <br />
                  <span className="text-brand-strong">Jualan lebih Pintar</span>
                </h2>
                <p className="mt-5 text-base text-ink-muted lg:text-lg">
                  Begitu data Pesanan cukup, MyGerai kasih rekomendasi otomatis
                  di Laporan Penjualan: kapan waktunya restock, jam paling
                  ramai, sampai Item yang sering dibeli bareng. Tidak perlu
                  paham data, tinggal baca dan jalankan.
                </p>
              </div>

              <div className="flex flex-col gap-5">
                {INSIGHT_EXAMPLES.map((insight, index) => (
                  <Card
                    key={insight.title}
                    pad="lg"
                    className="relative flex flex-col gap-3 overflow-hidden"
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute right-4 top-4 select-none text-4xl font-extrabold leading-none text-brand-tint"
                    >
                      0{index + 1}
                    </span>
                    {/* Eyebrow + garis bawah — teks kecil centered, tanpa
                    kotak/border, cuma garis tipis pendek di bawahnya. */}
                    <div className="relative flex flex-col items-center gap-1.5">
                      <span className="text-xs font-semibold text-brand-strong">
                        {insight.label}
                      </span>
                      <span
                        aria-hidden="true"
                        className="h-0.5 w-10 rounded-full bg-brand-strong"
                      />
                    </div>
                    <div className="relative flex max-w-[85%] flex-col gap-1.5">
                      <p className="text-base font-semibold text-ink">
                        {insight.title}
                      </p>
                      <p className="text-sm leading-relaxed text-ink-muted">
                        {insight.text}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA penutup */}
        <section className="relative w-full overflow-hidden border-t border-line bg-brand-strong">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_30%,rgb(255_255_255_/_0.08)_50%,transparent_70%)] bg-[length:200%_100%] motion-safe:animate-[shimmer_6s_ease-in-out_infinite]"
          />
          <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center gap-5 px-5 py-20 text-center sm:px-8 lg:py-32">
            <h2 className="text-3xl font-bold tracking-tight text-white lg:text-5xl">
              Siap Terima Pesanan
              <br />
              Tanpa Antre Lagi?
            </h2>
            <p className="max-w-md text-white/85 lg:text-lg">
              Isi data Lapak, tunggu approval Admin, langsung bisa terima
              Pesanan lewat QR hari itu juga.
            </p>
            <div className="flex flex-col items-center gap-4">
              <ButtonLink href="/daftar" variant="secondary" size="md">
                Daftarkan Lapak Sekarang
              </ButtonLink>
              <a
                href="/login"
                className="text-sm font-semibold text-white/85 underline-offset-4 hover:text-white hover:underline"
              >
                Sudah punya akun? Masuk
              </a>
            </div>
          </div>
        </section>

        {/* Ajak Pedagang Lain */}
        <section className="w-full border-t border-line">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 lg:py-32">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-ink lg:text-5xl">
                <span className="text-brand-strong">Ajak</span> Pedagang Lain
              </h2>
              <p className="mt-4 text-base text-ink-muted lg:text-lg">
                Cetak QR ini dan tempel di warung tetangga, pasar, atau
                komunitas pedagang kamu. Mereka tinggal scan, isi data, langsung
                bisa jualan online hari itu juga.
              </p>
            </div>

            <div className="mx-auto mt-12 flex max-w-xs flex-col items-center gap-5">
              {/* biome-ignore lint/performance/noImgElement: data URI, next/image tidak berlaku */}
              <img
                src={registerQrImageUrl}
                alt="Poster QR Pendaftaran Pedagang MyGerai"
                className="w-full drop-shadow-xl"
              />
              <DownloadQrPosterButton
                svgDataUrl={registerQrImageUrl}
                filename="qr-daftar-pedagang.png"
                label="Unduh QR Pendaftaran"
              />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
