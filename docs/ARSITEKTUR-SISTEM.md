# Arsitektur Sistem

## Gambaran Umum

MyGerai dibangun sebagai **satu aplikasi monolith Next.js** (bukan microservices) — sesuai [RULES.md](RULES.md#4-prioritas-desain) untuk menghindari over-engineering di skala kecil. Tiga "muka" (Pembeli, Pedagang, Admin) adalah route group berbeda dalam aplikasi yang sama, berbagi satu database PostgreSQL. Aplikasi & database sama-sama **self-hosted** di server milik User (Garuda), lihat ADR di bawah.

```mermaid
flowchart TB
    subgraph Client["Perangkat Pengguna"]
        Buyer["Pembeli (browser HP, tanpa akun)"]
        Merchant["Pedagang (browser HP/desktop, login)"]
        Admin["Admin (browser desktop, login)"]
    end

    subgraph Server["Server Garuda (Dokploy, di balik Cloudflare Tunnel)"]
        subgraph App["Next.js App"]
            BuyerRoutes["(buyer) — katalog, checkout, status pesanan"]
            MerchantRoutes["(merchant) — dashboard, kelola item, pesanan masuk"]
            AdminRoutes["(admin) — approval, konfigurasi, laporan"]
            API["Server Actions / Route Handlers\n(satu-satunya jalur ke DB)"]
            AuthCustom["Sesi login custom\n(hash password + cookie)"]
            RTCustom["Realtime custom\n(polling / SSE + LISTEN-NOTIFY)"]
            PP["Payment Provider abstraction\n(MockPaymentProvider sekarang, TripayPaymentProvider nanti)"]
        end
        DB[("PostgreSQL self-hosted")]
    end

    Gateway["Payment Gateway nyata\n(Tripay — fase lanjutan)"]

    Buyer --> BuyerRoutes --> API
    Merchant --> MerchantRoutes --> API
    Admin --> AdminRoutes --> API
    API --> AuthCustom
    API --> DB
    API --> PP
    PP -.fase lanjutan.-> Gateway
    DB -- perubahan data --> RTCustom
    RTCustom -- push/poll --> MerchantRoutes
```

## Alur Data: Checkout → Pembayaran → Notifikasi Pedagang

Lihat sequence diagram lengkap di [PRD.md §6.1](PRD.md#61-alur-pembeli). Poin arsitektural penting:

1. **Pembuatan Pesanan** terjadi lewat Server Action (bukan API route publik biasa) supaya validasi (harga, ketersediaan Item, isi Nama) terjadi di server, bukan dipercaya dari input klien.
2. **Total harga dihitung ulang di server** dari `products.price` saat itu (jangan percaya total yang dikirim dari browser) — mencegah manipulasi harga oleh Pembeli.
3. **`platform_fee_snapshot`** diambil dari `platform_config` aktif saat itu juga (lihat [DATA-MODEL.md](DATA-MODEL.md)).
4. Setelah Pesanan tercipta (`menunggu_pembayaran`), `PaymentProvider.createPayment()` dipanggil:
   - Tahap sekarang → `MockPaymentProvider`: langsung siapkan tombol simulasi, tidak ada pemanggilan API eksternal.
   - Fase lanjutan → `TripayPaymentProvider`: memanggil API Tripay untuk membuat QRIS dinamis sungguhan.
5. Konfirmasi pembayaran masuk lewat `PaymentProvider.handleCallback()`:
   - Mock: dipanggil langsung dari tombol UI Pembeli (aman karena bukan uang sungguhan).
   - Tripay (nanti): dipanggil dari **endpoint webhook** yang **wajib** verifikasi signature sebelum memproses apa pun (lihat [RULES.md §7](RULES.md#7-keamanan)) — jangan pernah percaya payload webhook tanpa verifikasi.
6. Perubahan status Pesanan di database sampai ke dashboard Pedagang lewat **polling berkala atau SSE** dari Route Handler (bukan Supabase Realtime — lihat ADR di bawah) — Pedagang tidak perlu refresh manual, tapi update-nya berjarak beberapa detik (bukan push instan), cukup untuk skala pedagang kaki lima.
7. Pembeli memantau status Pesanannya lewat halaman yang membaca `orders` by primary key (`orderId` di URL, UUID praktis tak tertebak) lewat Server Component/Route Handler — bukan subscribe langsung ke database (lihat [DATA-MODEL.md §Keamanan Multi-tenant](DATA-MODEL.md#keamanan-multi-tenant-isolasi-level-aplikasi)).

## Keamanan Multi-tenant

Lihat detail aturan di [DATA-MODEL.md](DATA-MODEL.md#keamanan-multi-tenant-isolasi-level-aplikasi). Prinsip: database **hanya** diakses lewat kode server tepercaya (Server Action/Route Handler) — browser tidak pernah konek langsung ke Postgres. Karena itu isolasi antar Lapak ditegakkan **di level aplikasi** (setiap fungsi yang menyentuh data Pedagang wajib memfilter berdasar identitas sesi login), bukan Row Level Security database — supaya bug di satu halaman tidak bisa membocorkan data Pedagang lain, disiplin ini harus konsisten dijaga di setiap Server Action baru.

## Kedaluwarsa Pesanan

Karena tidak ada background worker terpisah di tahap MVP (menghindari infrastruktur tambahan), status `kedaluwarsa` dicek secara **lazy**: setiap kali sebuah Pesanan `menunggu_pembayaran` dibaca (oleh Pembeli atau Pedagang) dan `now() > expires_at`, sistem langsung meng-update statusnya saat itu juga. Jika nanti volume besar & butuh kepastian (mis. Pesanan yang tidak pernah dibuka lagi oleh siapa pun), baru pertimbangkan cron job (lihat [BACKLOG.md](BACKLOG.md)).

## Keputusan Arsitektur Penting (ADR Ringkas)

| Tanggal | Keputusan | Alasan |
|---|---|---|
| 2026-09-05 | Model settlement **Agregator**, bukan Sub-merchant | Target pasar (pedagang kaki lima) kemungkinan besar tidak punya rekening bisnis/legalitas untuk daftar payment gateway sendiri. Agregator meniadakan friksi ini. Konsekuensi: Aplikator menampung dana sementara → butuh Pencairan manual (MVP) lalu otomatis (nanti). |
| 2026-09-05 | Payment gateway pilihan: **Tripay** (untuk fase lanjutan, belum dipakai sekarang) | Status badan usaha Aplikator: perorangan → Tripay salah satu yang bisa didaftar cukup dengan KTP. |
| 2026-09-05 | Pembayaran MVP **disimulasikan** (`MockPaymentProvider`) | Keputusan eksplisit User: fokus dulu ke alur inti pesanan sebelum urus approval merchant gateway sungguhan. |
| 2026-09-05 | Satu aplikasi monolith Next.js, bukan microservices | Skala kecil, tim kecil (User + Claude) — microservices akan menambah overhead ops tanpa manfaat di tahap ini. |
| 2026-09-05 | Autentikasi Pedagang/Admin tanpa OTP (nomor HP + password) | Hindari biaya SMS/WA OTP di awal; verifikasi identitas cukup lewat approval manual Admin. |
| 2026-09-05 | **Digantikan** oleh baris di bawah: rencana awal DB/Auth/Realtime/Storage/hosting via Supabase Cloud + Vercel | (baris ini tidak pernah dieksekusi — diganti sebelum ada project Supabase dibuat) |
| 2026-09-05 | Database, Auth, Realtime, Storage, dan hosting aplikasi **self-hosted** di server Garuda (milik User) via **Dokploy** + **Cloudflare Tunnel**, menggantikan rencana Supabase Cloud + Vercel | User sudah punya server & pola ops ini yang terbukti jalan untuk proyek lain (MyPlaza, Postgres+Dokploy+Cloudflare Tunnel) — reuse infrastruktur & pengalaman yang sudah ada, tanpa akun cloud baru/biaya tambahan. Konsekuensi: Auth, Realtime, Storage yang tadinya bawaan Supabase kini dibangun custom (lihat [TEKNOLOGI.md](TEKNOLOGI.md)); isolasi multi-tenant pindah dari RLS database ke level aplikasi (lihat [DATA-MODEL.md](DATA-MODEL.md#keamanan-multi-tenant-isolasi-level-aplikasi)) karena browser tidak lagi konek langsung ke DB seperti model Supabase `anon`/`authenticated`. |

> Tambahkan baris baru di sini setiap kali ada keputusan arsitektur baru/berubah — jangan menghapus baris lama (biarkan jadi histori), cukup tandai kalau sudah tidak berlaku dan rujuk baris penggantinya. Sinkronkan juga dengan [CHANGELOG.md](../CHANGELOG.md).
