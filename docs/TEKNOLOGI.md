# Teknologi — Stack & Alasan Pemilihan

> Prinsip utama: **cepat, ringan, minim biaya operasional, dan hemat effort dev** (User masih pemula di ranah ini; Claude akan menulis sebagian besar kode). Setiap pilihan wajib punya alasan tertulis di sini — kalau berubah, catat di [CHANGELOG.md](../CHANGELOG.md) dan alasan barunya.

## Ringkasan Stack

| Layer | Pilihan | Alasan Singkat |
|---|---|---|
| Bahasa | **TypeScript** (strict mode) | Type-safety mengurangi bug, membantu Claude menulis kode benar sejak awal. |
| Framework Full-stack | **Next.js (App Router)** | Satu framework untuk halaman Pembeli, dashboard Pedagang, dan panel Admin — tidak perlu backend terpisah. React Server Components membuat halaman Pembeli ringan (minim JS terkirim ke browser). |
| Database | **PostgreSQL self-hosted** (server Garuda milik User) | Sesuai infrastruktur yang sudah dipakai & terbukti jalan untuk proyek lain User (MyPlaza) — konsisten satu pola ops, tanpa biaya cloud DB tambahan. Diakses **hanya** lewat kode server (Server Action/Route Handler), tidak pernah langsung dari browser. |
| ORM | **Drizzle ORM** | Lebih ringan & cepat dibanding Prisma (query SQL yang dihasilkan minim overhead), tetap type-safe. |
| Realtime notifikasi Pedagang | **Polling atau SSE (Server-Sent Events)** dari Route Handler + `LISTEN/NOTIFY` Postgres | Tanpa Supabase, dibangun sendiri di atas Next.js — untuk skala pedagang kaki lima, polling berkala (mis. tiap beberapa detik) sudah cukup; SSE dipertimbangkan kalau perlu update lebih instan. Detail dipilih saat implementasi Fase 3. |
| Autentikasi Pedagang/Admin | **Custom** (hash password + sesi cookie) | Tanpa Supabase Auth — password di-hash (bcrypt/argon2) di server, sesi disimpan via cookie `HttpOnly`+`Secure` yang ditandatangani. Lihat [§Autentikasi](#autentikasi) di bawah. |
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

- **Pedagang & Admin**: nomor HP + password, dibangun sendiri (bukan lewat provider Auth pihak ketiga) — password di-hash (bcrypt/argon2) & disimpan di kolom `password_hash` (lihat [DATA-MODEL.md](DATA-MODEL.md)), sesi login memakai cookie `HttpOnly`+`Secure` yang ditandatangani. Alasan nomor HP (bukan email) & tanpa OTP: menghindari biaya SMS/WhatsApp OTP di tahap awal, dan nomor HP lebih mudah diingat pedagang informal. Verifikasi identitas cukup lewat proses approval manual Admin. **OTP bisa ditambahkan nanti** jika ditemukan penyalahgunaan (lihat [BACKLOG.md](BACKLOG.md)). Library/pendekatan pasti (mis. `iron-session`, atau custom JWT) dipilih saat implementasi Fase 3, dicatat di sini setelah final.
- **Pembeli**: tidak ada autentikasi sama sekali (sesuai [PRD.md](PRD.md)).

## Batasan Biaya (estimasi, untuk kesadaran User)

- Hosting app & database: **tanpa biaya tambahan** — pakai server Garuda yang sudah ada, sama seperti proyek User lainnya (MyPlaza).
- Tripay: tidak ada biaya bulanan, potongan hanya per transaksi QRIS sukses (mengikuti tarif QRIS yang diatur Bank Indonesia, MDR ~0,3% untuk UMKM) — ditagih ke Aplikator, bukan ke Pedagang secara langsung (Aplikator yang mengatur berapa yang diteruskan ke Pedagang lewat Biaya Layanan).
- Storage foto (kalau nanti pilih Cloudflare R2): tier gratis R2 cukup besar (10GB/bulan) untuk skala awal.
