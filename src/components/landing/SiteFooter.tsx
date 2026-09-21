import { Wordmark } from "@/components/ui/Wordmark";

export function SiteFooter() {
  return (
    <footer className="w-full border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-5 py-8 text-center sm:flex-row sm:justify-between sm:px-8 sm:text-left">
        <div>
          <Wordmark />
          <p className="mt-1 text-xs text-ink-muted">
            Pesan lewat scan QR, bayar QRIS, langsung masuk ke Pedagang.
          </p>
        </div>

        <p className="text-xs text-ink-muted">© 2026 MyGerai</p>
      </div>
    </footer>
  );
}
