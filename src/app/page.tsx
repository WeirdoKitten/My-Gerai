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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-10">
      <Wordmark className="text-lg" />

      <h1 className="mt-8 text-3xl font-extrabold leading-tight tracking-tight text-ink">
        Terima pesanan lewat QR, tanpa antre.
      </h1>
      <p className="mt-3 text-ink-muted">
        MyGerai membantu pedagang kaki lima menerima pesanan yang sudah dibayar
        QRIS langsung ke HP — pembeli cukup scan, pilih, bayar.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        <ButtonLink href="/daftar" fullWidth>
          Daftar
        </ButtonLink>
        <ButtonLink href="/login" variant="secondary" fullWidth>
          Masuk
        </ButtonLink>
      </div>

      <ol className="mt-12 flex flex-col gap-5">
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
    </main>
  );
}
