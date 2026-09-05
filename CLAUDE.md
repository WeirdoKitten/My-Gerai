# CLAUDE.md — Instruksi Proyek MyGerai

Dokumen ini otomatis dibaca setiap sesi Claude Code di proyek ini. Tujuannya: **konsistensi**, walau User berpindah-pindah room/chat.

## Apa Proyek Ini

**MyGerai** (nama kerja, lihat [docs/PRD.md](docs/PRD.md#nama-produk)) adalah sistem pemesanan berbasis QR + QRIS untuk pedagang kecil pinggir jalan/pasar (bakso, batagor, cakue, baju, dll) — versi sangat disederhanakan dari **[ESB Order](https://www.esb.id/id/solusi/produk/order)**. Alur inti: **Pembeli scan QR → pilih Item → bayar QRIS → Pesanan masuk ke Pedagang setelah lunas.** Pembeli **tanpa akun**, cukup isi Nama.

Status saat ini: **fase ground truth selesai, kode produksi belum ada** (lihat [docs/BACKLOG.md](docs/BACKLOG.md) untuk fase berikutnya).

## Ground Truth — WAJIB Dibaca Sebelum Kerja

Semua keputusan produk/arsitektur ada di `docs/`. **Ini satu-satunya sumber kebenaran** — jangan mengandalkan ingatan dari sesi chat lain yang tidak tercatat di sini.

| Dokumen | Isi | Baca kalau... |
|---|---|---|
| [docs/RULES.md](docs/RULES.md) | Aturan tertinggi proyek | Selalu relevan — baca dulu kalau baru mulai sesi |
| [docs/PRD.md](docs/PRD.md) | Spesifikasi produk, scope, alur pengguna, aturan bisnis | Mengerjakan/mengubah fitur apa pun |
| [docs/ARSITEKTUR-SISTEM.md](docs/ARSITEKTUR-SISTEM.md) | Arsitektur, alur data, keputusan teknis (ADR) | Perubahan yang menyentuh backend/integrasi/keamanan |
| [docs/ARSITEKTUR-FOLDER.md](docs/ARSITEKTUR-FOLDER.md) | Struktur folder & file target | Menambah file/folder baru |
| [docs/TEKNOLOGI.md](docs/TEKNOLOGI.md) | Stack & alasan pemilihan, Payment Provider abstraction | Menambah dependency/library/service baru |
| [docs/DATA-MODEL.md](docs/DATA-MODEL.md) | Skema data, ERD, aturan RLS | Mengubah/menambah tabel atau kolom |
| [docs/BACKLOG.md](docs/BACKLOG.md) | Daftar task per fase | Menentukan apa yang dikerjakan berikutnya |
| [docs/BEST-PRACTICES.md](docs/BEST-PRACTICES.md) | Performa, keamanan, error handling, testing | Menulis kode fitur apa pun |
| [docs/CODING-STYLE.md](docs/CODING-STYLE.md) | Konvensi penulisan kode & istilah domain | Menulis kode apa pun |
| [docs/DOKUMENTASI.md](docs/DOKUMENTASI.md) | Kapan & bagaimana update dokumen ground truth | Selesai mengerjakan sesuatu yang berdampak ke ground truth |
| [docs/CLAUDE-SKILLS.md](docs/CLAUDE-SKILLS.md) | Kapan pakai skill Claude Code apa | Merencanakan alur kerja sebuah task |
| [docs/PROMPT-TIPS.md](docs/PROMPT-TIPS.md) | Tips untuk User menulis prompt efektif | (Untuk User, tapi baca juga untuk paham ekspektasi kolaborasi) |
| [docs/GLOSSARY.md](docs/GLOSSARY.md) | Istilah domain baku | Ragu istilah apa yang benar dipakai |
| [CHANGELOG.md](CHANGELOG.md) | Riwayat perubahan ground truth & fitur besar | Ingin tahu histori keputusan |

## ATURAN PALING PENTING (ringkasan — detail lengkap di [docs/RULES.md](docs/RULES.md))

1. **Bahasa Indonesia yang baik dan benar** untuk komunikasi, dokumentasi, UI, dan pesan commit. Kode (identifier) tetap Bahasa Inggris.
2. **Jangan berasumsi.** Kalau ada yang ambigu/tidak jelas — terutama menyangkut uang, data model inti, atau UX Pembeli — **tanya User dulu** dengan opsi konkret, jangan menebak.
3. **Ground truth di atas segalanya.** Baca dokumen relevan sebelum kerja; update dokumen + [CHANGELOG.md](CHANGELOG.md) setelah ada perubahan berdampak. Perubahan **signifikan** wajib dikonfirmasi User dulu.
4. **Sederhana, cepat, ringan.** Hindari over-engineering (skala target: pedagang kaki lima, bukan enterprise). Prioritaskan performa halaman Pembeli (mobile, jaringan lambat).
5. **Pembeli tidak login** — identifikasi cukup field Nama. Jangan tambah friksi tanpa persetujuan User.
6. **Uang selalu dapat dikonfigurasi** (Biaya Layanan default Rp1.000, dsb) dan nilainya di-snapshot per Pesanan agar histori tidak berubah retroaktif.
7. **Pembayaran tahap ini disimulasikan** (`MockPaymentProvider`) — belum integrasi nyata ke Tripay. Tetap tulis kode lewat abstraksi `PaymentProvider` (lihat [docs/TEKNOLOGI.md](docs/TEKNOLOGI.md#payment-provider-abstraction)) supaya migrasi ke provider nyata tidak perlu bongkar arsitektur.
8. **`/security-review` wajib** untuk kode yang menyentuh pembayaran/auth/webhook/RLS.
9. Fitur baru masuk [docs/BACKLOG.md](docs/BACKLOG.md) dulu sebelum dikerjakan (kecuali bugfix kecil).
10. Jangan tandai selesai tanpa verifikasi nyata (jalankan/coba, bukan cuma yakin dari membaca kode).

## Istilah Kunci (lengkap di [docs/GLOSSARY.md](docs/GLOSSARY.md))

**Aplikator** = pemilik platform (User) · **Pedagang/Lapak** = penjual · **Pembeli** = customer tanpa akun · **Item** = produk/menu · **Pesanan** = order · **Biaya Layanan** = fee Rp1.000/transaksi (configurable) · **Model Agregator** = dana masuk 1 akun platform dulu, baru dicairkan ke Pedagang.

## Stack Ringkas (detail & alasan di [docs/TEKNOLOGI.md](docs/TEKNOLOGI.md))

Next.js (App Router) + TypeScript + Tailwind CSS + PostgreSQL (self-hosted) + Drizzle ORM + Zod + Biome + Vitest/Playwright + pnpm. Auth/Realtime/Storage dibangun custom (bukan Supabase). Hosting: server sendiri (Garuda) via Dokploy + Cloudflare Tunnel. Payment gateway masa depan: Tripay (perorangan, KTP saja) — untuk sekarang disimulasikan.

## Alur Kerja Default untuk Task Apa Pun

1. Cek [docs/BACKLOG.md](docs/BACKLOG.md) — apakah ini sudah tercatat, atau perlu ditambahkan dulu.
2. Baca dokumen ground truth yang relevan dari tabel di atas.
3. Kalau ada yang ambigu → tanya User (jangan asumsi).
4. Untuk fitur besar → Plan mode dulu.
5. Implementasi sesuai [docs/CODING-STYLE.md](docs/CODING-STYLE.md) & [docs/BEST-PRACTICES.md](docs/BEST-PRACTICES.md).
6. Verifikasi nyata (jalankan/test), `/security-review` kalau relevan.
7. Update ground truth terkait + [CHANGELOG.md](CHANGELOG.md) + centang [docs/BACKLOG.md](docs/BACKLOG.md).

Lihat detail lengkap alur & skill di [docs/CLAUDE-SKILLS.md](docs/CLAUDE-SKILLS.md).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
