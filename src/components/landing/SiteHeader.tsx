import { ButtonLink } from "@/components/ui/ButtonLink";
import { Wordmark } from "@/components/ui/Wordmark";

const NAV_LINKS = [
  { href: "/#cara-kerja", label: "Cara Kerja" },
  { href: "/#fitur", label: "Fitur" },
  { href: "/#asisten", label: "Asisten" },
  { href: "/gerai", label: "Semua Gerai" },
];

/**
 * Header dipakai landing (`/`) dan direktori publik (`/gerai`) — link
 * seksi pakai path absolut (`/#cara-kerja`, bukan `#cara-kerja`) supaya
 * tetap benar dibuka dari halaman mana pun, bukan cuma landing sendiri.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-line bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <a href="/" aria-label="Beranda MyGerai">
          <Wordmark className="text-lg" />
        </a>
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
          <ButtonLink href="/daftar" variant="primary" size="sm">
            Daftar
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
