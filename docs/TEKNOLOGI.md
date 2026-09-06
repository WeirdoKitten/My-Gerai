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
| Storage foto Item/Lapak | **Belum diputuskan** | Kandidat: volume Docker persisten di server Garuda (paling sederhana, tanpa service tambahan) atau Cloudflare R2 (S3-compatible, gratis untuk skala kecil, cocok karena User sudah pakai Cloudflare Tunnel). Diputuskan bareng User saat fitur upload foto dikerjakan (Fase 2/3), dicatat di sini setelah final. |
| Styling | **Tailwind CSS** | Utility-first, CSS hasil build kecil (hanya class yang dipakai), cepat untuk membuat UI konsisten. |
| Komponen UI dasar | **shadcn/ui / Radix primitives** (dipakai seperlunya) | Hindari library UI berat (mis. MUI) yang membengkakkan bundle. |
| Payment Gateway (tahap lanjutan) | **Tripay** | Salah satu dari sedikit payment gateway Indonesia yang bisa didaftarkan dengan **KTP saja** (cocok dengan status badan usaha Aplikator: **perorangan**). Mendukung QRIS. Lihat detail di bawah. |
| Payment Gateway (tahap MVP sekarang) | **MockPaymentProvider** (buatan sendiri, disimulasikan) | Lihat [Payment Provider Abstraction](#payment-provider-abstraction) di bawah. |
| Hosting app & database | **Server sendiri (Garuda)** via **Dokploy** + **Cloudflare Tunnel** | Sama seperti proyek User yang lain (MyPlaza) — pola ops yang sudah dikenal, tanpa akun cloud baru, tanpa biaya hosting tambahan. Cloudflare Tunnel menghindari perlu buka port publik/IP statis. |
| Package manager | **pnpm** | Lebih hemat disk & lebih cepat install dibanding npm/yarn. |
| Lint & Format | **Biome** | Satu tool cepat (berbasis Rust) untuk lint+format, menggantikan kombinasi ESLint+Prettier yang lebih berat & butuh konfigurasi ganda. |
| Testing | **Vitest** (unit) + **Playwright** (E2E, alur kritikal: checkout, webhook) | Ringan, cepat, terintegrasi baik dengan Next.js/TypeScript. |
| Validasi input | **Zod** | Skema validasi type-safe, dipakai di form & server action. |
| Monitoring error (nanti) | **Sentry** (free tier) | Ditambahkan setelah MVP jalan, bukan blocker awal. |
| QR Code generator | Library `qrcode` (Node) | Generate QR Lapak (server-side) sebagai gambar untuk diunduh/dicetak Pedagang. |

## Kenapa Bukan Alternatif Lain?

- **Astro/SvelteKit** dipertimbangkan untuk halaman Pembeli (JS lebih minim), tapi memisahkan framework untuk buyer vs seller/admin menambah kompleksitas & konteks yang harus dikelola (kurang cocok untuk tim kecil + AI-assisted dev). Next.js dengan disiplin RSC (lihat [BEST-PRACTICES.md](BEST-PRACTICES.md#performa)) dianggap cukup ringan sambil tetap satu ekosistem.
- **Prisma** dipertimbangkan (DX lebih ramah pemula) tapi Drizzle dipilih karena lebih ringan saat runtime — trade-off ini diterima karena Claude yang menulis sebagian besar query, bukan User langsung.
- **Midtrans/Xendit** dipertimbangkan tapi secara historis lebih menyasar bisnis berbadan hukum (PT skala menengah–besar); approval untuk akun **perorangan** lebih lambat/rumit dibanding Tripay. Bisa dipertimbangkan ulang jika Aplikator naik status jadi PT/CV (lihat [PRD.md](PRD.md#8-risiko--catatan)).
- **Supabase Cloud** (Postgres+Auth+Realtime+Storage terkelola) sempat jadi rencana awal (lihat [CHANGELOG.md](../CHANGELOG.md) 2026-09-05 entri inisialisasi), tapi diganti ke **self-hosted di server Garuda** setelah dibahas dengan User: User sudah punya server + pola ops (Dokploy + Cloudflare Tunnel) yang terbukti jalan untuk proyek lain (MyPlaza), jadi tidak perlu akun cloud baru atau biaya tambahan. Konsekuensinya: Auth, Realtime, dan Storage yang tadinya "gratis" dari Supabase sekarang harus dibangun sendiri (lihat baris terkait di tabel atas) — trade-off yang diterima karena reuse infrastruktur & pengalaman yang sudah ada lebih diutamakan daripada fitur bawaan Supabase.

## Payment Provider Abstraction

Karena keputusan User: **"untuk payment buat simulasi pembayaran sampai berhasil saja dulu, tidak perlu benar-benar terintegrasi"** — pembayaran nyata **bukan** bagian dari MVP awal. Supaya nanti gampang "dicolok" ke Tripay tanpa bongkar arsitektur, payment diakses lewat satu interface:

```ts
interface PaymentProvider {
  createPayment(order: Order): Promise<{ qrImageUrl: string; referenceId: string }>;
  // Dipanggil oleh webhook (nyata) ATAU tombol simulasi (mock)
  handleCallback(payload: unknown): Promise<{ referenceId: string; status: "success" | "failed" }>;
}
```

- **`MockPaymentProvider`** (dipakai sekarang): `createPayment` mengembalikan gambar QR placeholder/dummy; ada tombol khusus di halaman status Pesanan ("Simulasikan Pembayaran Berhasil") yang langsung memanggil `handleCallback` dengan status sukses.
- **`TripayPaymentProvider`** (dipakai nanti, lihat [BACKLOG.md](BACKLOG.md)): `createPayment` memanggil API Tripay untuk membuat QRIS dinamis; `handleCallback` dipanggil dari endpoint webhook yang **wajib** verifikasi signature Tripay sebelum memproses (lihat [RULES.md](RULES.md#7-keamanan)).
- Field `provider` disimpan di tabel `payments` (lihat [DATA-MODEL.md](DATA-MODEL.md)) supaya jelas transaksi mana yang mock vs nyata — **penting agar data simulasi tidak pernah tercampur dengan data transaksi nyata setelah go-live**.

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
- Tripay: tidak ada biaya bulanan, potongan hanya per transaksi QRIS sukses (mengikuti tarif QRIS yang diatur Bank Indonesia, MDR ~0,3% untuk UMKM) — ditagih ke Aplikator, bukan ke Pedagang secara langsung (Aplikator yang mengatur berapa yang diteruskan ke Pedagang lewat Biaya Layanan).
- Storage foto (kalau nanti pilih Cloudflare R2): tier gratis R2 cukup besar (10GB/bulan) untuk skala awal.
