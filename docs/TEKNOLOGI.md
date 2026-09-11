# Teknologi — Stack & Alasan Pemilihan

> Prinsip utama: **cepat, ringan, minim biaya operasional, dan hemat effort dev** (User masih pemula di ranah ini; Claude akan menulis sebagian besar kode). Setiap pilihan wajib punya alasan tertulis di sini — kalau berubah, catat di [CHANGELOG.md](../CHANGELOG.md) dan alasan barunya.

## Ringkasan Stack

| Layer | Pilihan | Alasan Singkat |
|---|---|---|
| Bahasa | **TypeScript** (strict mode) | Type-safety mengurangi bug, membantu Claude menulis kode benar sejak awal. |
| Framework Full-stack | **Next.js (App Router)** | Satu framework untuk halaman Pembeli, dashboard Pedagang, dan panel Admin — tidak perlu backend terpisah. React Server Components membuat halaman Pembeli ringan (minim JS terkirim ke browser). |
| Database | **PostgreSQL self-hosted** (server Garuda milik User) | Sesuai infrastruktur yang sudah dipakai & terbukti jalan untuk proyek lain User (MyPlaza) — konsisten satu pola ops, tanpa biaya cloud DB tambahan. Diakses **hanya** lewat kode server (Server Action/Route Handler), tidak pernah langsung dari browser. |
| ORM | **Drizzle ORM** | Lebih ringan & cepat dibanding Prisma (query SQL yang dihasilkan minim overhead), tetap type-safe. |
| Realtime notifikasi Pedagang | **Polling** client-side tiap beberapa detik (Server Action dipanggil ulang) | Tanpa Supabase Realtime — untuk skala pedagang kaki lima, polling berkala sudah cukup terbukti (dipakai di halaman status Pesanan Pembeli & dashboard Pedagang sejak Fase 2-3). SSE/`LISTEN-NOTIFY` Postgres jadi opsi upgrade kalau nanti butuh update lebih instan, belum dibutuhkan sekarang. |
| Autentikasi Pedagang/Admin | **Custom** — hash password `scrypt` bawaan Node + sesi DB-backed (tabel `sessions`) | Tanpa Supabase Auth, tanpa library baru. Lihat [§Autentikasi](#autentikasi) di bawah untuk detail final. |
| Storage foto Item/Lapak | **Volume Docker persisten** di server Garuda (`UPLOADS_DIR`, default `/app/uploads`) | Diputuskan User 2026-09-08 (lihat [ARSITEKTUR-SISTEM.md](ARSITEKTUR-SISTEM.md) ADR). Paling sederhana — tanpa akun/API/service baru. Disajikan lewat Route Handler `src/app/uploads/[...path]/route.ts` (path-sanitized). Foto di-resize di klien (`src/lib/upload/resize-image.ts`, tanpa `sharp`). Trade-off: container tidak lagi stateless (perlu named volume dimount di Dokploy), backup manual. Cloudflare R2 dipertimbangkan & ditolak untuk sekarang (kesederhanaan menang; bisa dipindah nanti kalau butuh multi-instance/CDN). |
| Styling | **Tailwind CSS v4** (config via `@theme` di `globals.css`) | Utility-first, CSS hasil build kecil (hanya class yang dipakai). Token desain (warna/tipografi/radius/shadow) didefinisikan sekali di `@theme` — lihat [DESAIN-SISTEM.md](DESAIN-SISTEM.md). |
| Font | **Plus Jakarta Sans** (via `next/font/google`) | Dibuat untuk konteks Indonesia, hangat & modern. Satu family (tanpa mono — angka pakai `tabular-nums`). |
| Komponen UI dasar | **Primitif buatan sendiri** di `src/components/ui/` (Button, Input, Field, Card, Badge, Alert, dst) | Tanpa library UI/ikon eksternal (shadcn/Radix tidak jadi dipakai) — komponen proyek ini sederhana, sedikit, dan sepenuhnya dikontrol; ikon = inline SVG (`ui/icons.tsx`). Hindari beban bundle di halaman Pembeli. |
| Payment Gateway (produksi, Fase 6) | **Midtrans** — Core API (`payment_type: "qris"`) untuk QRIS dinamis | Dipilih User (2026-09-08) menggantikan Tripay: satu ekosistem dengan **Iris** (disbursement) untuk Pencairan otomatis "Model B", sandbox lengkap, dokumentasi & SDK matang. Mendukung QRIS. Lihat [Payment Provider Abstraction](#payment-provider-abstraction) & [ARSITEKTUR-SISTEM.md](ARSITEKTUR-SISTEM.md) ADR 2026-09-08. **Catatan**: fitur split/marketplace Midtrans kemungkinan butuh badan usaha — Model B **tidak** memakainya (cukup akun standar), perlu diverifikasi User sebelum go-live. |
| Disbursement (Pencairan otomatis, Fase 6) | **Midtrans Iris** (`/api/v1/payouts`) | Transfer **Saldo Pedagang** otomatis ke rekening/e-wallet tiap Lapak (batch harian). Diakses lewat abstraksi `DisbursementProvider` (mirror `PaymentProvider`). Biaya transfer per payout ditanggung Pedagang (dipotong dari Pencairan). |
| Payment Gateway (dev/unit/E2E test) | **MockPaymentProvider** + **MockDisbursementProvider** (buatan sendiri) | Dipilih lewat env `PAYMENT_PROVIDER=mock` / `DISBURSEMENT_PROVIDER=mock`. Tombol "Simulasikan Pembayaran Berhasil" tetap ada untuk uji alur tanpa Midtrans. Lihat [Payment Provider Abstraction](#payment-provider-abstraction). |
| Hosting app & database | **Server sendiri (Garuda)** via **Dokploy** + **Cloudflare Tunnel** | Sama seperti proyek User yang lain (MyPlaza) — pola ops yang sudah dikenal, tanpa akun cloud baru, tanpa biaya hosting tambahan. Cloudflare Tunnel menghindari perlu buka port publik/IP statis. Migrasi database jalan otomatis saat container start (lihat [ARSITEKTUR-SISTEM.md](ARSITEKTUR-SISTEM.md) ADR 2026-09-07); deploy = set env var di Dokploy lalu klik Deploy. |
| Package manager | **pnpm** | Lebih hemat disk & lebih cepat install dibanding npm/yarn. |
| Lint & Format | **Biome** | Satu tool cepat (berbasis Rust) untuk lint+format, menggantikan kombinasi ESLint+Prettier yang lebih berat & butuh konfigurasi ganda. |
| Bundler skrip DB (build-time) | **esbuild** | Hanya dipakai di stage `builder` Dockerfile untuk mem-*bundle* `src/lib/db/{migrate,seed-demo,create-admin}.ts` jadi file `.mjs` mandiri (drizzle-orm + postgres di-inline) — supaya image runner minimal tidak perlu `drizzle-kit`/devDependencies. Sudah jadi dependency transitif (via Next/Tailwind), cuma dinaikkan jadi devDependency eksplisit. |
| Testing | **Vitest** (unit) + **Playwright** (E2E, alur kritikal: checkout, webhook) | Ringan, cepat, terintegrasi baik dengan Next.js/TypeScript. |
| Validasi input | **Zod** | Skema validasi type-safe, dipakai di form & server action. |
| Monitoring error (nanti) | **Sentry** (free tier) | Ditambahkan setelah MVP jalan, bukan blocker awal. |
| QR Code generator | Library `qrcode` (Node) | Generate QR Menu (server-side) sebagai gambar untuk diunduh/dicetak Pedagang. |

## Kenapa Bukan Alternatif Lain?

- **Astro/SvelteKit** dipertimbangkan untuk halaman Pembeli (JS lebih minim), tapi memisahkan framework untuk buyer vs seller/admin menambah kompleksitas & konteks yang harus dikelola (kurang cocok untuk tim kecil + AI-assisted dev). Next.js dengan disiplin RSC (lihat [BEST-PRACTICES.md](BEST-PRACTICES.md#performa)) dianggap cukup ringan sambil tetap satu ekosistem.
- **Prisma** dipertimbangkan (DX lebih ramah pemula) tapi Drizzle dipilih karena lebih ringan saat runtime — trade-off ini diterima karena Claude yang menulis sebagian besar query, bukan User langsung.
- **Tripay** sempat jadi pilihan (2026-09-05) karena bisa didaftar dengan **KTP saja** (Aplikator = perorangan). **Diganti Midtrans (2026-09-08)** setelah User memutuskan Pencairan otomatis ("Model B"): Midtrans punya **Iris** (disbursement) dalam satu ekosistem, sedangkan Tripay tidak sekuat itu untuk payout. Payment nyata dasar (QRIS acceptance) di Midtrans bisa untuk akun perorangan/UMKM; yang berpotensi butuh badan usaha adalah fitur **split/marketplace** — dan Model B **tidak** memakainya. Perlu diverifikasi User ke Midtrans sebelum go-live (lihat [PRD.md §8](PRD.md#8-risiko--catatan)).
- **Xendit** (xenPlatform punya split payment kuat) dipertimbangkan untuk model Split-Marketplace tapi model itu ditunda (butuh badan usaha & onboarding sub-merchant per Lapak) — lihat [ARSITEKTUR-SISTEM.md](ARSITEKTUR-SISTEM.md) ADR 2026-09-08.
- **Supabase Cloud** (Postgres+Auth+Realtime+Storage terkelola) sempat jadi rencana awal (lihat [CHANGELOG.md](../CHANGELOG.md) 2026-09-05 entri inisialisasi), tapi diganti ke **self-hosted di server Garuda** setelah dibahas dengan User: User sudah punya server + pola ops (Dokploy + Cloudflare Tunnel) yang terbukti jalan untuk proyek lain (MyPlaza), jadi tidak perlu akun cloud baru atau biaya tambahan. Konsekuensinya: Auth, Realtime, dan Storage yang tadinya "gratis" dari Supabase sekarang harus dibangun sendiri (lihat baris terkait di tabel atas) — trade-off yang diterima karena reuse infrastruktur & pengalaman yang sudah ada lebih diutamakan daripada fitur bawaan Supabase.

## Payment Provider & Disbursement Provider Abstraction

Pembayaran & pencairan diakses lewat dua interface supaya implementasi nyata (Midtrans) bisa "dicolok" tanpa bongkar arsitektur, dan versi `mock` tetap dipakai untuk dev/unit/E2E test.

```ts
// src/lib/payment/types.ts — implementasi final Fase 6a
interface PaymentProvider {
  readonly name: "mock" | "midtrans";
  createPayment(input: { orderId: string; grossAmount: number; expiryMinutes: number }):
    Promise<{ referenceId: string; qrString: string; expiresAt: Date | null }>;
  // Dipanggil dari webhook (Midtrans) ATAU tombol simulasi (mock).
  // `null` = keaslian tidak terverifikasi (signature salah) → WAJIB ditolak.
  handleCallback(payload: unknown):
    Promise<{ referenceId: string; orderId: string; status: "success" | "pending" | "expired" | "failed" } | null>;
  // Backstop kalau webhook telat/hilang (mock: undefined).
  getTransactionStatus?(orderId: string): Promise<{ status: "success" | "pending" | "expired" | "failed" } | null>;
}

// (target Fase 6b)
interface DisbursementProvider {
  validateBankAccount(bankCode: string, accountNumber: string): Promise<{ ok: boolean; accountHolder?: string }>;
  createPayout(p: { merchantId: string; amount: number; bankCode: string; accountNumber: string }): Promise<{ referenceId: string; transferFee: number; status: "processing" | "completed" | "failed" }>;
  handleCallback(payload: unknown): Promise<{ referenceId: string; status: "completed" | "failed"; failureReason?: string }>;
}
```

- **`MockPaymentProvider`** (env `PAYMENT_PROVIDER=mock`, default): `createPayment` mengembalikan `qrString` dummy; tombol "Simulasikan Pembayaran Berhasil" di halaman status Pesanan memanggil `handleCallback` sukses langsung. `simulatePaymentSuccess` **menolak** kalau provider bukan `mock`.
- **`MidtransPaymentProvider`** (env `PAYMENT_PROVIDER=midtrans`, Fase 6a): `createPayment` → Midtrans Core API `POST /v2/charge` (`payment_type: "qris"`, `custom_expiry` = durasi kedaluwarsa Pesanan); `qr_string` disimpan di `payments` & dirender jadi gambar **di server** pakai lib `qrcode` (`getOrderStatus`, tidak charge ulang tiap poll). `handleCallback` dipanggil dari `POST /api/webhooks/payment` yang **wajib** verifikasi `signature_key` = `SHA512(order_id + status_code + gross_amount + ServerKey)` (`timingSafeEqual`) sebelum memproses (lihat [RULES.md §7](RULES.md#7-keamanan)). Logika transisi status bersama ada di `src/lib/payment/settle.ts` (modul biasa, bukan Server Action).
- **`MockDisbursementProvider`** / **`IrisDisbursementProvider`** (env `DISBURSEMENT_PROVIDER=mock|iris`): Iris `/api/v1/payouts` untuk transfer nyata; callback status masuk `POST /api/webhooks/payout`.
- Field `provider` disimpan di tabel `payments` **dan** `payouts` supaya jelas mana `mock` vs `midtrans`/`iris` — **penting agar data simulasi tidak pernah tercampur dengan transaksi nyata setelah go-live** (lihat [DATA-MODEL.md](DATA-MODEL.md)).
- **QRIS Pribadi (Fase 7) SENGAJA BUKAN implementasi `PaymentProvider` baru** — mode ini tidak punya `createPayment` (tidak ada panggilan gateway sama sekali) atau `handleCallback` (tidak ada webhook, konfirmasi manual Pedagang) sungguhan, jadi memaksakannya ke interface ini cuma menambah kompleksitas tanpa manfaat. `createOrder` (`src/server/orders.ts`) cabang langsung berdasar `merchants.payment_mode`, skip pemanggilan `getPaymentProvider()` untuk Lapak `qris_pribadi`. `payments.provider = "qris_pribadi"` tetap dipakai (baris `payments` tetap diisi demi keseragaman dengan `settleOrderPayment`), tapi bukan lewat abstraksi ini. Lihat [ARSITEKTUR-SISTEM.md](ARSITEKTUR-SISTEM.md#alur-data-qris-pribadi--tagihan-biaya-layanan-mingguan-fase-7).
- **Tagihan Biaya Layanan** (Pedagang `qris_pribadi` → Aplikator, arah kebalikan dari `payments`) juga bukan lewat `PaymentProvider` — charge-nya dibuat fungsi kecil `createServiceFeeInvoiceCharge()` di `src/lib/payment/midtrans-provider.ts` (reuse helper privat `baseUrl()`/`authHeader()`), dipanggil dari job `src/lib/billing/service-fee.ts`, bukan per-Pesanan Pembeli.

### Environment variables (Fase 6)

```
PAYMENT_PROVIDER=mock            # mock (default, dev/test) | midtrans
MIDTRANS_SERVER_KEY=             # dari dashboard.sandbox.midtrans.com → Settings → Access Keys
MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false     # "true" hanya di produksi

DISBURSEMENT_PROVIDER=mock       # mock (default) | iris
DISBURSEMENT_ENABLED=false       # "true" untuk mengaktifkan job Pencairan harian
IRIS_API_KEY=                    # Iris "Creator" API key (sandbox: dashboard Iris)
IRIS_IS_PRODUCTION=false

CRON_SECRET=                     # bearer token untuk POST /api/cron/* (disburse, bill-service-fee, dst — di-set di tiap Scheduled Job Dokploy)
```

`MIDTRANS_CLIENT_KEY` boleh terekspos ke klien (dipakai Snap.js kalau nanti perlu); **Server Key & Iris API Key TIDAK PERNAH** ke klien — hanya dipakai di Server Action/Route Handler.

### Setup Midtrans sandbox (ringkas — langkah lengkap diberikan ke User per sesi)

1. Daftar akun di `dashboard.sandbox.midtrans.com` (gratis, tanpa verifikasi bisnis untuk sandbox).
2. **Settings → Access Keys**: salin `Server Key` + `Client Key` sandbox → isi `.env`.
3. **Settings → Configuration → Payment Notification URL**: `https://<domain-tunnel>/api/webhooks/payment` (butuh URL publik — pakai Cloudflare Tunnel yang sudah ada, atau `cloudflared tunnel` sementara untuk dev).
4. **Iris (menu terpisah di dashboard)**: aktifkan, buat/ambil `Creator` API key sandbox, set callback URL `https://<domain>/api/webhooks/payout`. Sandbox Iris memberi saldo virtual + daftar rekening dummy untuk uji payout.
5. Uji bayar: buat Pesanan → buka `simulator.sandbox.midtrans.com` (QRIS) → tandai "Paid" → webhook masuk → status jadi `dibayar`.

## Autentikasi

**Keputusan final (Fase 3-4, lihat [src/lib/auth/](../src/lib/auth/)):**

- **Hash password**: `scrypt` bawaan modul `node:crypto` — bukan bcrypt/argon2/bcryptjs. Alasan: nol dependency baru (selaras prinsip minim dependency), dan `bcrypt`/`argon2` butuh native binding yang berisiko gagal compile di image `node:24-alpine` (lihat `Dockerfile`) tanpa build-toolchain tambahan. Format simpan: `"<saltHex>:<hashHex>"` di kolom `password_hash`, verifikasi pakai `crypto.timingSafeEqual` (aman dari timing attack). Dipakai sama persis untuk Pedagang (`merchants.password_hash`) maupun Admin (`admins.password_hash`).
- **Sesi login**: **dua tabel terpisah** — `sessions` untuk Pedagang, `admin_sessions` untuk Admin (Fase 4) — bukan satu tabel polimorfik, karena `merchants`/`admins` sudah sengaja dipisah sejak awal (lihat [DATA-MODEL.md §admin_sessions](DATA-MODEL.md#admin_sessions-sesi-login-admin--fase-4)). Mekanismenya identik: token bearer acak 32-byte di cookie `HttpOnly`+`Secure` (production)+`SameSite=Lax`, hanya **hash SHA-256** token yang disimpan di DB (bukan token mentah). Cookie Pedagang bernama `mygerai_session`, cookie Admin bernama `mygerai_admin_session` — sengaja beda nama supaya keduanya bisa aktif berdampingan di browser yang sama (mis. Admin login di tab lain sambil sesi Pedagang tetap jalan). Alasan DB-backed (bukan JWT stateless): revocable instan saat logout, dan status `approved` Pedagang di-re-cek tiap request lewat sesi — begitu Pedagang di-suspend, sesi lama otomatis invalid tanpa proses cabut-sesi eksplisit. Admin **tidak** punya gate status seperti ini (Admin = akun internal tepercaya) — begitu password cocok, sesi langsung dibuat.
- **Pedagang & Admin**: nomor HP + password. Alasan nomor HP (bukan email) & tanpa OTP: menghindari biaya SMS/WhatsApp OTP di tahap awal, dan nomor HP lebih mudah diingat pedagang informal. Verifikasi identitas Pedagang cukup lewat proses approval manual Admin — login dengan password benar tapi status belum `approved` menampilkan pesan status (termasuk **alasan spesifik** yang ditulis Admin kalau status `rejected`, dari kolom `merchants.rejection_reason`), sesi/cookie tidak dibuat. **OTP bisa ditambahkan nanti** jika ditemukan penyalahgunaan (lihat [BACKLOG.md](BACKLOG.md)).
- **Akun Admin produksi**: **tidak ada UI self-service** untuk membuat akun Admin (sesuai [PRD.md](PRD.md) — Admin adalah akun internal Aplikator, bukan fitur produk). Untuk dev lokal, akun contoh dibuat lewat `src/lib/db/seed.ts`. Untuk produksi: buat lewat **insert SQL manual satu kali** ke tabel `admins` (hash password dulu pakai fungsi `hashPassword` yang sama, mis. lewat skrip Node sekali-jalan) — sengaja tidak dibangun sebagai fitur/endpoint karena frekuensinya sangat jarang (biasanya cuma 1 akun Admin) dan menambah permukaan serangan (endpoint pembuatan Admin) tanpa manfaat sepadan.
- **Pembeli**: tidak ada autentikasi sama sekali (sesuai [PRD.md](PRD.md)).
- **Rate-limiting** (Fase 5, lihat [src/lib/rate-limit/limiter.ts](../src/lib/rate-limit/limiter.ts)): fixed-window counter **in-memory** (satu `Map`, tanpa dependency/infra baru — sesuai izin eksplisit [BEST-PRACTICES.md §Keamanan](BEST-PRACTICES.md#keamanan) untuk "solusi ringan dulu"). Diterapkan di 4 titik: `loginMerchant`/`loginAdmin` (5 percobaan/5 menit, dicek **dua key** — per-IP DAN per-nomor-HP, karena brute-force satu akun vs spam banyak akun dari satu sumber adalah dua ancaman berbeda), `registerMerchant` (5/60 menit per-IP), `createOrder` (20 Pesanan/10 menit per-IP, dibuat longgar karena CGNAT operator seluler Indonesia bisa membuat beberapa Pembeli sah terlihat satu IP). Pesan saat limit tercapai generik (tidak membocorkan apakah batas per-IP/per-akun, menjaga pola anti-enumeration). IP klien diambil dari header `cf-connecting-ip` (di-set Cloudflare di edge, **tidak bisa dipalsukan klien** — beda dengan `x-forwarded-for` yang cuma di-*append* jadi segmen pertamanya bisa disisipi klien untuk melompati limit; ditemukan & diperbaiki lewat `/security-review` Fase 5), fallback ke segmen terakhir `x-forwarded-for` untuk dev lokal tanpa Cloudflare. **Keterbatasan yang diketahui/diterima**: state in-memory reset saat restart proses & tidak sinkron lintas instance — aman untuk deployment single-instance Docker (Dokploy) saat ini; kalau nanti pindah ke multi-instance, ganti ke store bersama (mis. Redis).

## Batasan Biaya (estimasi, untuk kesadaran User)

- Hosting app & database: **tanpa biaya tambahan** — pakai server Garuda yang sudah ada, sama seperti proyek User lainnya (MyPlaza).
- Midtrans: tidak ada biaya bulanan. **MDR QRIS** per transaksi sukses (~0,7% umum, bisa 0% untuk transaksi kecil skema "QRIS bebas biaya" UMI — tergantung klasifikasi akun, cek ke Midtrans) — **ditagih ke akun Aplikator**, dan **ditanggung Aplikator** (dipotong dari margin Biaya Layanan; **tidak boleh** dibebankan ke Pembeli — [PBI 23/6/PBI/2021 Ps. 52](https://peraturan.bpk.go.id/Details/207042/peraturan-bi-no-236pbi2021)). **Iris** (disbursement): biaya per transfer (~Rp2.500–5.000 bank; lebih murah/gratis e-wallet) — **ditanggung Pedagang** (dipotong dari tiap Pencairan). Lihat [ARSITEKTUR-SISTEM.md](ARSITEKTUR-SISTEM.md) ADR 2026-09-08.
- Storage foto (kalau nanti pilih Cloudflare R2): tier gratis R2 cukup besar (10GB/bulan) untuk skala awal.
