# Changelog Ground Truth & Fitur

> Riwayat perubahan pada dokumen ground truth (`docs/*`, `CLAUDE.md`) dan fitur besar aplikasi. Format entri: lihat [docs/DOKUMENTASI.md](docs/DOKUMENTASI.md#format-entri-changelogmd). Entri terbaru di paling atas.

## 2026-09-05 — Siapkan Dockerfile produksi untuk deploy via Dokploy

**Dampak:** [docs/ARSITEKTUR-FOLDER.md](docs/ARSITEKTUR-FOLDER.md), [docs/BACKLOG.md](docs/BACKLOG.md), kode (`Dockerfile`, `.dockerignore`, `next.config.ts`, `public/`)
**Alasan:** User sudah push kode ke GitHub & minta tutorial deploy ke Dokploy — Dockerfile disiapkan dulu supaya Dokploy bisa build image secara predictable.
**Ringkasan:** `next.config.ts` ditambah `output: "standalone"`. `Dockerfile` multi-stage (deps → builder → runner) mengikuti pola resmi Next.js untuk pnpm, image akhir cuma berisi server Node minimal (tanpa devDependencies). Diverifikasi nyata: `docker build` berhasil, container dijalankan (`docker run`) dan terbukti bisa serve halaman + konek ke Postgres lokal lewat `host.docker.internal`. Folder `public/` (sebelumnya belum ada) dibuat kosong (placeholder `.gitkeep`) supaya langkah `COPY` di Dockerfile tidak gagal.

## 2026-09-05 — Fase 2 selesai: alur inti Pembeli (katalog, keranjang, checkout, simulasi bayar)

**Dampak:** [docs/BACKLOG.md](docs/BACKLOG.md), [docs/ARSITEKTUR-FOLDER.md](docs/ARSITEKTUR-FOLDER.md), kode (`src/app/(buyer)/**`, `src/server/`, `src/lib/{payment,cart,validation,utils}/`, `src/components/buyer/`, `src/lib/db/seed.ts`, `docker-compose.dev.yml`, `package.json`)
**Alasan:** Mengerjakan Fase 2 di BACKLOG.md sesuai instruksi User, dengan Plan mode dulu (fitur besar, menyentuh alur uang) sesuai RULES §5.2.
**Ringkasan:**
- Implementasi penuh alur Pembeli: katalog Lapak (`/menu/[stallSlug]`), keranjang sisi klien (React Context + `useReducer` + localStorage, tanpa dependency baru), checkout (form Nama + ringkasan), Server Action `createOrder` (hitung ulang total & snapshot Biaya Layanan sepenuhnya di server), halaman status Pesanan (`/pesanan/[orderId]`) dengan polling 4 detik + tombol "Simulasikan Pembayaran Berhasil", kedaluwarsa otomatis (lazy check).
- `MockPaymentProvider` (`src/lib/payment/`) — QR digenerate on-demand via `qrcode` (data URI), tidak disimpan di DB; `referenceId` deterministik (`MOCK-{orderId}`).
- **Verifikasi nyata** (bukan cuma baca kode): dijalankan lewat Postgres 18 native (bukan Docker — jaringan Docker Hub bermasalah persisten di sesi ini, gagal pull berulang kali; Postgres native Windows yang sudah terpasang User dipakai sebagai gantinya, role/database khusus proyek dibuat terpisah dari akun `postgres` bawaan) + browser sungguhan (Playwright headless, karena `chromium-cli` tidak tersedia). Terverifikasi: fallback `platform_config` kosong (default Rp1.000/15 menit), anti-manipulasi harga (localStorage diubah manual, total Pesanan tetap dari harga DB), transisi status pembayaran stabil (diuji lintas siklus polling), kedaluwarsa otomatis, halaman 404 custom.
- `/security-review` dijalankan (wajib, kode menyentuh pembayaran) — tidak ada temuan kerentanan dengan keyakinan tinggi.
- **Ditunda ke Fase 5** (sesuai scope asli BACKLOG, bukan penundaan baru): unit test formal, rate-limiting checkout.
- `docker-compose.dev.yml` tetap disiapkan di root untuk opsi Postgres via Docker nanti (dev-only) — tidak dipakai kali ini karena masalah jaringan.

## 2026-09-05 — Keputusan final: pindah dari Supabase Cloud+Vercel ke self-hosted (Garuda)

**Dampak:** [CLAUDE.md](CLAUDE.md), [docs/TEKNOLOGI.md](docs/TEKNOLOGI.md), [docs/ARSITEKTUR-SISTEM.md](docs/ARSITEKTUR-SISTEM.md), [docs/DATA-MODEL.md](docs/DATA-MODEL.md), [docs/RULES.md](docs/RULES.md), [docs/BACKLOG.md](docs/BACKLOG.md), [docs/BEST-PRACTICES.md](docs/BEST-PRACTICES.md), [docs/PROMPT-TIPS.md](docs/PROMPT-TIPS.md), kode (`src/lib/db/schema.ts`, `src/lib/db/client.ts`, `package.json`, `drizzle/`, `.env.example`)
**Alasan:** User sudah punya proyek e-commerce lain (MyPlaza) yang jalan di server sendiri ("Garuda", server tempat kerja) pakai Postgres + Dokploy + Cloudflare Tunnel — pola yang terbukti jalan. Setelah membahas trade-off (reuse Supabase self-hosted penuh vs Postgres polos + custom) dan kapasitas server ("pas-pasan/tidak yakin"), User memutuskan **samakan dengan pola MyPlaza**: Postgres polos, bukan Supabase (cloud maupun self-hosted).
**Ringkasan:**
- **Database & hosting**: PostgreSQL self-hosted di server Garuda, aplikasi Next.js juga di-deploy ke sana — keduanya lewat **Dokploy** + **Cloudflare Tunnel**. Menggantikan rencana awal Supabase Cloud (DB/Auth/Realtime/Storage) + Vercel (hosting app).
- **Auth**: Supabase Auth diganti custom — kolom `password_hash` ditambahkan ke tabel `merchants` & `admins` (hash bcrypt/argon2 di server), sesi login lewat cookie `HttpOnly`+`Secure`. Detail library dipilih saat implementasi Fase 3.
- **Realtime**: Supabase Realtime diganti polling berkala atau SSE + Postgres `LISTEN/NOTIFY`, dibangun sendiri di Route Handler. Detail dipilih saat implementasi Fase 3.
- **Storage foto**: belum diputuskan (kandidat: volume Docker di Garuda, atau Cloudflare R2) — dicatat sebagai keputusan terbuka di TEKNOLOGI.md, diputuskan saat fitur upload foto dikerjakan.
- **Keamanan multi-tenant**: RLS Postgres (yang tadinya ditulis deklaratif di `schema.ts` pakai `drizzle-orm/supabase`) **dihapus total** — diganti aturan wajib di level aplikasi (setiap Server Action yang menyentuh data Pedagang wajib filter eksplisit berdasar sesi login). Alasannya: browser tidak pernah konek langsung ke DB di arsitektur ini (beda dari model Supabase `anon`/`authenticated` key), jadi RLS tidak menambah proteksi nyata, hanya kompleksitas. [RULES.md §7.3](docs/RULES.md#7-keamanan) diperbarui mengikuti ini.
- Efek samping yang menguntungkan: pertanyaan terbuka sebelumnya soal "bagaimana Pembeli anon akses Pesanan miliknya sendiri untuk Realtime" **otomatis terjawab** — karena Pembeli juga tidak pernah konek langsung ke DB, cukup query by `orders.id` (UUID) lewat Server Component/Route Handler, tanpa perlu token/sesi anonim tambahan.
- Skema Drizzle (`src/lib/db/schema.ts`) ditulis ulang: hapus semua `pgPolicy`/`.enableRLS()`/import `drizzle-orm/supabase`, `merchants.id`/`admins.id` kembali jadi `defaultRandom()` biasa (bukan disamakan `auth.uid()`). Dependency `@supabase/supabase-js` dilepas. Migrasi awal digenerate ulang bersih (belum pernah di-push ke DB manapun, aman diregenerasi). `pnpm build`/`tsc --noEmit`/`pnpm lint` lulus setelah perubahan.
- **Masih tertunda**: akses User ke server Garuda (Dokploy) untuk benar-benar provision database & deploy staging.

## 2026-09-05 — Mulai Fase 1: scaffold Next.js, skema Drizzle, RLS dasar

**Dampak:** [docs/ARSITEKTUR-FOLDER.md](docs/ARSITEKTUR-FOLDER.md), [docs/DATA-MODEL.md](docs/DATA-MODEL.md), [docs/BACKLOG.md](docs/BACKLOG.md), kode (`package.json`, `src/`, `drizzle.config.ts`, `drizzle/`)
**Alasan:** Mengerjakan Fase 1 di BACKLOG.md sesuai instruksi User.
**Ringkasan:**
- Scaffold Next.js 16 (App Router) + TypeScript strict + Tailwind v4 + Biome lewat `create-next-app`, disesuaikan ke struktur `docs/ARSITEKTUR-FOLDER.md` (README.md/CLAUDE.md/.gitignore proyek dipertahankan, tidak ditimpa). `pnpm build`, `pnpm exec tsc --noEmit`, dan `pnpm lint` semua lulus.
- Tambah Drizzle ORM + `postgres` driver + `@supabase/supabase-js` + `zod`. Skema penuh (`src/lib/db/schema.ts`) dibuat 1:1 dari `docs/DATA-MODEL.md` (8 tabel), pakai `casing: "snake_case"` supaya field JS camelCase otomatis jadi kolom snake_case. Migrasi awal berhasil digenerate (`drizzle-kit generate`) dan diperiksa manual SQL-nya — belum di-push ke database sungguhan (belum ada project Supabase).
- RLS diterapkan **deklaratif di skema** (`pgPolicy` + `.enableRLS()` dari `drizzle-orm/supabase`, bukan SQL terpisah), supaya jadi satu migrasi dengan tabelnya. Keputusan desain baru (belum ada di DATA-MODEL.md sebelumnya): `merchants.id`/`admins.id` disamakan dengan `auth.uid()` Supabase Auth-nya (bukan kolom FK terpisah) — didokumentasikan di DATA-MODEL.md.
- **Belum diputuskan** (perlu User sebelum Fase 2): mekanisme akses Pembeli (anon) ke baris Pesanan miliknya sendiri untuk halaman status real-time — lihat opsi di DATA-MODEL.md §Keamanan Multi-tenant.
- `.claude/settings.json` (permission dasar `pnpm`/`git`) dibuat — percobaan pertama sempat diblokir permission classifier bawaan Claude Code, berhasil di percobaan berikutnya.
- **Tertunda, butuh input User**: pembuatan project Supabase asli (Auth/Realtime/Storage) & env vars, setup deployment — dua-duanya perlu akun/server User. Diskusi dengan User: hosting kemungkinan pindah dari rencana awal (Vercel + Supabase Cloud) ke **self-hosted di server Garuda** (server tempat kerja User, sudah dipakai untuk proyek lain "MyPlaza") lewat **Dokploy + Cloudflare Tunnel** — pola yang sudah terbukti dipakai User. Untuk Next.js: **disepakati** deploy ke Garuda via Dokploy (bukan Vercel). Untuk database/backend: masih menunggu User cek kapasitas RAM sisa server Garuda (`free -h`) untuk menentukan self-host **full Supabase stack** (Postgres+Auth+Realtime+Storage, tidak perlu ubah kode Fase 1 sama sekali) vs **Postgres polos + Auth/Realtime/Storage custom** (lebih ringan resource, tapi perlu desain ulang RLS di `schema.ts` karena `auth.uid()`/role `anon`/`authenticated` cuma ada kalau Supabase Auth-nya juga di-self-host). Keputusan final akan dicatat sebagai ADR baru di ARSITEKTUR-SISTEM.md begitu User konfirmasi.

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
