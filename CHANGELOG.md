# Changelog Ground Truth & Fitur

> Riwayat perubahan pada dokumen ground truth (`docs/*`, `CLAUDE.md`) dan fitur besar aplikasi. Format entri: lihat [docs/DOKUMENTASI.md](docs/DOKUMENTASI.md#format-entri-changelogmd). Entri terbaru di paling atas.

## 2026-09-05 — Klarifikasi skill bawaan vs custom `.claude/`

**Dampak:** [docs/CLAUDE-SKILLS.md](docs/CLAUDE-SKILLS.md), [docs/BACKLOG.md](docs/BACKLOG.md)
**Alasan:** User bertanya apakah perlu folder `.claude/` berisi skill custom. Dikonfirmasi ke agent panduan Claude Code bahwa `.claude/skills/`, `.claude/agents/`, `.claude/settings.json` adalah mekanisme terpisah dari `docs/CLAUDE-SKILLS.md` (yang hanya memandu pemakaian skill bawaan).
**Ringkasan:** Diputuskan **belum** membuat isi `.claude/` sekarang (proyek belum ada kode/workflow konkret untuk dibungkus jadi skill — sesuai prinsip KISS). Ditambahkan rencana: `.claude/settings.json` (permission dasar) dibuat di Fase 1 scaffolding; custom skill baru dipertimbangkan setelah ada workflow berulang yang nyata.

## 2026-09-05 — Inisialisasi seluruh ground truth proyek

**Dampak:** Semua file di `docs/`, `CLAUDE.md`, `README.md` (dibuat pertama kali)
**Alasan:** Proyek baru dimulai; User meminta ground truth/acuan pengembangan lengkap sebelum mulai coding, supaya arah pengembangan terarah & konsisten walau berpindah room chat.
**Ringkasan:**
- Riset [ESB Order](https://www.esb.id/id/solusi/produk/order) sebagai inspirasi utama; alur inti diadaptasi (scan QR → pilih → bayar → masuk ke penjual), disederhanakan untuk skala pedagang kaki lima (tanpa meja, satu metode bayar, Pembeli hanya isi Nama).
- Ditetapkan 3 keputusan bisnis kunci lewat konfirmasi User: model settlement **Agregator** (bukan sub-merchant), status badan usaha Aplikator **perorangan** (→ payment gateway masa depan: **Tripay**), dan onboarding Pedagang **self-service + approval Admin**.
- Ditetapkan lewat instruksi User: pembayaran tahap awal **disimulasikan** (`MockPaymentProvider`), belum integrasi nyata — dirancang lewat abstraksi `PaymentProvider` agar mudah diganti nanti.
- Ditetapkan stack teknologi: Next.js + TypeScript + Tailwind + Supabase (Postgres/Auth/Realtime/Storage) + Drizzle ORM + Biome + Vitest/Playwright, hosting Vercel + Supabase Cloud — dipilih atas dasar efisiensi (cepat, ringan, minim biaya & ops).
- Biaya Layanan (fee Aplikator) ditetapkan default Rp1.000/transaksi sukses, **dapat dikonfigurasi** Admin, disimpan sebagai snapshot per Pesanan.
- Disusun 12 dokumen ground truth: RULES, PRD, ARSITEKTUR-SISTEM, ARSITEKTUR-FOLDER, TEKNOLOGI, DATA-MODEL, BACKLOG, BEST-PRACTICES, CODING-STYLE, DOKUMENTASI, CLAUDE-SKILLS, PROMPT-TIPS, GLOSSARY — plus `CLAUDE.md` dan `README.md` di root.
