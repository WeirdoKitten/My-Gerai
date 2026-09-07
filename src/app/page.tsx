import { ButtonLink } from "@/components/ui/ButtonLink";
import { CartIcon, QrIcon, StoreIcon } from "@/components/ui/icons";
import { Wordmark } from "@/components/ui/Wordmark";

const STEPS = [
  {
    icon: QrIcon,
    title: "Pembeli scan QR Lapak",
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

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-16">
      <Wordmark className="text-lg" />

      <div className="mt-10 grid items-center gap-10 md:mt-14 md:grid-cols-2 md:gap-16">
        <div>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl">
            Terima pesanan lewat QR, tanpa antre.
          </h1>
          <p className="mt-4 text-ink-muted sm:text-lg">
            MyGerai membantu pedagang kaki lima menerima pesanan yang sudah
            dibayar QRIS langsung ke HP — pembeli cukup scan, pilih, bayar.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:max-w-xs">
            <ButtonLink href="/daftar" fullWidth>
              Daftar
            </ButtonLink>
            <ButtonLink href="/login" variant="secondary" fullWidth>
              Masuk
            </ButtonLink>
          </div>
        </div>

        <ol className="flex flex-col gap-5 rounded-card border border-line bg-surface p-6">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand">
                <step.icon className="size-5" />
              </div>
              <div>
                <p className="font-semibold text-ink">
                  {index + 1}. {step.title}
                </p>
                <p className="text-sm text-ink-muted">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
