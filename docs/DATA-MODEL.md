# Data Model

> Pemetaan istilah: lihat [GLOSSARY.md](GLOSSARY.md). Nama tabel di bawah pakai Bahasa Inggris (konvensi kode, lihat [CODING-STYLE.md](CODING-STYLE.md)) dengan komentar istilah Indonesia-nya.

## Diagram Relasi

```mermaid
erDiagram
    ADMINS ||--o{ MERCHANTS : "approve"
    MERCHANTS ||--o{ PRODUCTS : "punya"
    MERCHANTS ||--o{ ORDERS : "menerima"
    MERCHANTS ||--o{ PAYOUTS : "menerima pencairan"
    MERCHANTS ||--o{ SERVICE_FEE_INVOICES : "ditagih (qris_pribadi)"
    ORDERS ||--|{ ORDER_ITEMS : "terdiri dari"
    PRODUCTS ||--o{ ORDER_ITEMS : "dipesan sebagai"
    ORDERS ||--o| PAYMENTS : "dibayar via"
    PAYOUTS ||--o{ ORDERS : "mencairkan dana"
    PLATFORM_CONFIG ||--o{ ORDERS : "fee snapshot dari"
    MERCHANTS ||--o{ SESSIONS : "login"
    ADMINS ||--o{ ADMIN_SESSIONS : "login"

    MERCHANTS {
        uuid id PK
        string slug "untuk URL QR Menu"
        string stall_name "Nama Lapak"
        string owner_name "Nama Pedagang"
        string category
        string phone
        string password_hash
        string photo_url
        string status "pending|approved|rejected|suspended"
        string rejection_reason "alasan Admin saat status=rejected, nullable"
        string payment_mode "gateway|qris_pribadi. HANYA Admin yang boleh ubah (setMerchantPaymentMode), default gateway (Fase 7)"
        string qris_photo_url "foto QRIS statis milik Pedagang, path /uploads/qris/<uuid>.<ext>, nullable (Fase 7)"
        string payout_bank_code "kode bank/e-wallet Iris (mis. bca, bri, gopay), nullable"
        string payout_account_number "nomor rekening/e-wallet, nullable"
        string payout_account_holder "nama pemilik hasil validasi Iris, nullable"
        timestamp created_at
    }

    PRODUCTS {
        uuid id PK
        uuid merchant_id FK
        string name
        text description
        int price
        int stock "nullable; null = tak terbatas. Berkurang GREATEST(stock-qty,0) saat Pesanan dibayar (2026-09-08)."
        string photo_url "nullable; path /uploads/products/<uuid>.<ext> hasil upload Pedagang (Fase Foto Item, 2026-09-08). Disimpan di volume Docker, bukan di DB."
        string status "available|sold_out"
        timestamp created_at
    }

    ORDERS {
        uuid id PK
        uuid merchant_id FK
        uuid payout_id FK "diisi saat dana Pesanan masuk satu Pencairan; NULL = belum dicairkan (Fase 6)"
        string order_code "Kode Pesanan, mis. B231"
        string buyer_name "Nama Pembeli"
        text buyer_note
        string status "menunggu_pembayaran|dibayar|diproses|siap_diambil|selesai|dibatalkan|kedaluwarsa"
        int subtotal "harga Item x qty (pendapatan Pedagang, diterima penuh)"
        int platform_fee_snapshot "snapshot Biaya Layanan saat itu (dibebankan ke Pembeli)"
        int total_for_merchant "= subtotal (Biaya Layanan tidak dipotong sejak ADR 2026-09-09)"
        timestamp created_at
        timestamp paid_at
        timestamp expires_at
        timestamp completed_at
    }

    ORDER_ITEMS {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        string product_name_snapshot
        int price_snapshot
        int qty
        text note
    }

    PAYMENTS {
        uuid id PK
        uuid order_id FK "UNIQUE — 1 pembayaran per Pesanan"
        string provider "mock|midtrans|qris_pribadi (enum lama: tripay, tidak dipakai)"
        string reference_id "transaction_id Midtrans; = order_id sendiri kalau provider=qris_pribadi (tak ada referensi eksternal)"
        int gross_amount "nominal yang BENAR-BENAR dibayar Pembeli lewat channel ini: subtotal+platform_fee_snapshot (gateway) ATAU cuma subtotal (qris_pribadi, Biaya Layanan jadi piutang, lihat SERVICE_FEE_INVOICES)"
        string qr_string "payload QRIS mentah dari Midtrans, dirender lokal jadi gambar, nullable. NULL kalau qris_pribadi — dirender dari merchants.qris_photo_url saat baca, bukan disimpan per-payment"
        string status "pending|success|failed|expired"
        text raw_payload "payload mentah webhook/simulasi untuk audit"
        timestamp expires_at "kedaluwarsa QRIS dari Midtrans, nullable"
        timestamp paid_at
    }

    PAYOUTS {
        uuid id PK
        uuid merchant_id FK
        string provider "iris|mock"
        date period_date "tanggal batch; UNIQUE(merchant_id, period_date)"
        int amount "SUM(total_for_merchant Pesanan yang tercakup)"
        int transfer_fee "biaya transfer Iris, ditanggung Pedagang"
        int net_amount "amount - transfer_fee (yang benar-benar diterima Pedagang)"
        string reference_id "reference_no Iris, nullable sampai terkirim"
        string beneficiary_bank "snapshot kode bank saat payout"
        string beneficiary_account "snapshot nomor rekening saat payout"
        string beneficiary_name "snapshot nama pemilik saat payout"
        string status "pending|processing|completed|failed"
        string failure_reason "diisi kalau status=failed, nullable"
        timestamp created_at
        timestamp settled_at "diisi saat status=completed"
    }

    SERVICE_FEE_INVOICES {
        uuid id PK
        uuid merchant_id FK
        timestamp period_start
        timestamp period_end
        int amount "SUM(orders.platform_fee_snapshot) Pesanan qris_pribadi lunas dalam periode ini"
        timestamp due_at "= period_end (jatuh tempo langsung saat periode tutup, tanpa buffer tambahan)"
        string status "belum_lunas|lunas|dibatalkan"
        string provider "mock|midtrans — channel charge tagihan ini dibuat"
        string reference_id "Midtrans transaction_id charge tagihan; null sampai charge dibuat"
        string qr_string "QR untuk Pedagang bayar tagihan ke Aplikator; null sampai charge dibuat"
        timestamp paid_at
        string void_reason "catatan Admin saat override manual (Tandai Lunas)/pembatalan, nullable"
        timestamp created_at
    }

    PLATFORM_CONFIG {
        uuid id PK
        string key "platform_fee_amount, order_expiry_minutes, qris_mdr_bps, service_fee_billing_cycle_days, service_fee_grace_period_days"
        string value
        timestamp effective_from
    }

    ADMINS {
        uuid id PK
        string name
        string phone
        string password_hash
    }

    SESSIONS {
        uuid id PK
        uuid merchant_id FK
        string token_hash "SHA-256 dari token di cookie, bukan token mentah"
        timestamp created_at
        timestamp expires_at
    }

    ADMIN_SESSIONS {
        uuid id PK
        uuid admin_id FK
        string token_hash "SHA-256 dari token di cookie, bukan token mentah"
        timestamp created_at
        timestamp expires_at
    }
```

## Catatan per Entitas

### `merchants` (Pedagang/Lapak)
- MVP asumsi **1 baris = 1 Pedagang = 1 Lapak** (lihat [PRD.md](PRD.md#5-di-luar-lingkup-mvp-out-of-scope--dicatat-sebagai-ide-masa-depan-di-backlogmd)). Kalau nanti butuh multi-Lapak per Pedagang, perlu migrasi memisahkan `merchants` (identitas Pedagang) dari `stalls` (Lapak) — jangan dilakukan sebelum benar-benar dibutuhkan (lihat [RULES.md](RULES.md#4-prioritas-desain)).
- `slug` dipakai di URL QR Menu (`/menu/{slug}`), harus unik, dibuat otomatis dari `stall_name` + suffix acak jika bentrok.
- `status = pending` saat baru daftar; QR Menu baru bisa diakses publik setelah `approved`.
- `password_hash`: hash password login Pedagang (nomor HP + password, lihat [TEKNOLOGI.md §Autentikasi](TEKNOLOGI.md#autentikasi)) — **tidak pernah** simpan plaintext, hash pakai algoritma lambat (mis. bcrypt/argon2) di server saat registrasi/ganti password.
- `rejection_reason` (nullable, Fase 4): diisi Admin **wajib** saat menolak pendaftaran (`status → rejected`), ditampilkan ke Pedagang saat mereka mencoba login supaya tidak perlu kontak terpisah untuk tahu alasannya. Direset ke `null` kalau Pedagang yang sama nantinya di-*approve* (dari status lain, lewat proses manual/masa depan).
- `payout_bank_code` / `payout_account_number` / `payout_account_holder` (nullable, Fase 6): **menggantikan** kolom lama `payout_account_info` (teks bebas). Diisi Pedagang di `/dashboard/profil`, `payout_account_holder` hasil `DisbursementProvider.validateBankAccount()` (Iris) — bukan diketik. Job Pencairan otomatis **melewati** Lapak yang ketiganya belum lengkap/tervalidasi (Admin lihat penanda di `/admin/merchants`).
- `payment_mode` (Fase 7, default `gateway`): **hanya Admin** yang boleh mengubah (`setMerchantPaymentMode`, ditolak server kalau mau switch ke `qris_pribadi` tapi `qris_photo_url` masih kosong) — Pedagang cuma unggah/kelola foto QRIS miliknya sendiri, bukan self-service ganti mode. Lihat [ARSITEKTUR-SISTEM.md ADR 2026-09-11](ARSITEKTUR-SISTEM.md).
- `qris_photo_url` (nullable, Fase 7): foto QRIS statis Pedagang, path `/uploads/qris/<uuid>.<ext>` (pola sama upload foto Item/Lapak — volume Docker, magic-bytes validation). Dipakai sebagai gambar QR di halaman status Pesanan Pembeli saat `payment_mode = qris_pribadi`.

### `admins`
- `password_hash`: sama seperti `merchants.password_hash`, dibuat manual oleh Admin lain lewat proses internal (bukan self-service).

### `products` (Item)
- `status = sold_out` dipakai Pedagang untuk menyembunyikan Item yang habis tanpa menghapus datanya (histori pesanan lama tetap valid lewat snapshot di `order_items`).

### `orders` (Pesanan)
- `order_code`: pendek & mudah disebutkan lisan (huruf+angka, mis. 4 karakter), **unik per hari per Lapak** (boleh berulang lintas hari/lintas Lapak) — cukup untuk kebutuhan verbal saat pengambilan, tidak perlu unik global.
- `platform_fee_snapshot`: **wajib** diisi dari nilai `platform_config` yang berlaku **saat Pesanan dibuat**, bukan dihitung ulang saat laporan ditarik — ini yang membuat histori tidak berubah kalau Admin ubah Biaya Layanan di kemudian hari (lihat [RULES.md](RULES.md#6-uang--konfigurasi-bisnis)).
- `expires_at` dihitung saat Pesanan dibuat = `created_at + order_expiry_minutes` (dari `platform_config`). Sebuah job/cron (atau pengecekan lazy saat halaman dibuka) mengubah status jadi `kedaluwarsa` jika lewat waktu & masih `menunggu_pembayaran`.
- `subtotal` = jumlah `harga Item × qty` = **pendapatan Pedagang** (diterima penuh; `total_for_merchant = subtotal`).
- **`grand_total` = `subtotal + platform_fee_snapshot`** = **yang dibayar Pembeli** (sejak [ARSITEKTUR-SISTEM.md](ARSITEKTUR-SISTEM.md) ADR 2026-09-09 — Biaya Layanan dibebankan ke Pembeli). **Bukan kolom** — turunan dari dua kolom snapshot yang sudah immutable, jadi tak perlu disimpan/migrasi. Nilai inilah yang dikirim ke payment gateway & disalin ke `payments.gross_amount`. MDR QRIS **tidak** ditambahkan ke sini (dilarang di-surcharge ke Pembeli — PBI 23/6/PBI/2021 Ps. 52); MDR ditanggung Aplikator di luar pembukuan per-Pesanan.
- `payout_id` (nullable, Fase 6): NULL selama dana Pesanan belum masuk Pencairan. Diisi oleh job Pencairan otomatis saat baris `payouts` dibuat. Order dengan `payout_id` terisi **tidak** ikut dihitung lagi di Saldo Pedagang. Kalau Pencairan gagal → di-*unlink* kembali ke NULL.

### `order_items`
- Menyimpan `product_name_snapshot` & `price_snapshot` supaya kalau Pedagang mengubah harga/nama Item di kemudian hari, histori Pesanan lama tidak ikut berubah.

### `payments`
- `provider = mock` untuk transaksi dev/test, `provider = midtrans` untuk staging/produksi (lihat [TEKNOLOGI.md](TEKNOLOGI.md#payment-provider--disbursement-provider-abstraction)), `provider = qris_pribadi` (Fase 7) untuk Pesanan Lapak yang bayar langsung ke QRIS Pedagang (tanpa gateway sama sekali). **Wajib** difilter/dipisah per `provider` di semua laporan keuangan, supaya uang "palsu" (mock) tidak tercampur perhitungan real. Enum lama `tripay` dibiarkan di definisi enum (tidak pernah dipakai) — tidak perlu migrasi menghapusnya.
- `gross_amount` = nominal yang BENAR-BENAR dibayar Pembeli lewat channel ini: `orders.subtotal + orders.platform_fee_snapshot` untuk `provider ∈ {mock, midtrans}` (ADR 2026-09-09), tapi cuma `orders.subtotal` untuk `provider = qris_pribadi` — QRIS statis tidak bisa menambahkan Biaya Layanan dinamis saat itu juga, jadi fee-nya jadi piutang yang ditagih belakangan (lihat `service_fee_invoices`). Nilai `gross_amount` di payload webhook sudah terikat ke `signature_key` (SHA512), jadi verifikasi signature otomatis menolak payload yang nominalnya diutak-atik. Nullable: baris `mock` lama.
- `qr_string` = payload QRIS mentah (Midtrans `qr_string` / payload teks dummy dari mock). Dirender jadi gambar **di server MyGerai** pakai lib `qrcode` di `getOrderStatus` — tidak mengambil gambar dari host Midtrans (tidak perlu `remotePatterns`) dan tidak charge ulang tiap polling. Nullable (baris lama, ATAU `provider = qris_pribadi` — di mode ini gambar QR yang ditampilkan diambil langsung dari `merchants.qris_photo_url`, bukan dari kolom ini).
- `expires_at` = kedaluwarsa QRIS dari gateway (Midtrans: `custom_expiry` sesuai `order_expiry_minutes`; mock: `null`). Informasional — kedaluwarsa otoritatif tetap `orders.expires_at`.
- `raw_payload` menyimpan payload mentah webhook (nyata) atau payload simulasi (mock) untuk audit/debug.

### `payouts` (Pencairan) — Fase 6: otomatis, bukan manual lagi
- **Dibuat oleh job Pencairan otomatis** (`POST /api/cron/disburse`, batch harian), **bukan** dicatat manual Admin. Pencairan manual **dihapus** (`/admin/payouts` jadi read-only). Lihat [ARSITEKTUR-SISTEM.md §Alur Data: Pencairan Otomatis](ARSITEKTUR-SISTEM.md#alur-data-pencairan-otomatis-ke-pedagang-model-b--fase-6).
- `UNIQUE(merchant_id, period_date)` — pengaman idempotensi: satu Lapak paling banyak satu batch Pencairan per hari, walau endpoint cron kepanggil dua kali.
- `amount` = `SUM(total_for_merchant)` dari Pesanan yang di-*link* (`orders.payout_id` di-set ke baris ini dalam transaksi yang sama). `transfer_fee` (dari respons Iris) **ditanggung Pedagang** → `net_amount = amount − transfer_fee` yang benar-benar diterima Pedagang.
- `beneficiary_*` = **snapshot** rekening tujuan saat Pencairan dibuat (kalau Pedagang ganti rekening kemudian, riwayat Pencairan lama tetap menunjukkan ke mana dulu uang dikirim).
- `status`: `pending` (baris dibuat, belum dikirim ke Iris) → `processing` (dikirim) → `completed` (callback Iris sukses, isi `settled_at`) / `failed` (isi `failure_reason`; Pesanan yang tadinya di-link di-*unlink* `payout_id = NULL` supaya ikut batch berikutnya). Enum lama `selesai` **diganti** `completed`+`processing`+`failed` (migrasi enum).
- **Saldo Pedagang** (istilah di [GLOSSARY.md](GLOSSARY.md)) — nilai turunan, sekarang: `SUM(orders.total_for_merchant WHERE status IN (dibayar, diproses, siap_diambil, selesai) AND payout_id IS NULL)` per Lapak = bagian yang **belum** masuk Pencairan mana pun. Tidak lagi pakai `SUM(orders) − SUM(payouts)` (rawan salah kalau ada payout `failed`/`processing`). Tidak perlu kolom saldo tersendiri.

### `service_fee_invoices` (Tagihan Biaya Layanan — Fase 7)
- Tagihan **pascabayar mingguan** untuk Lapak `qris_pribadi`: uang Pesanan langsung ke Pedagang, jadi Biaya Layanan tidak bisa dipotong otomatis seperti model Agregator — ditagih belakangan lewat sini. Dibuat oleh job `POST /api/cron/bill-service-fee` (`src/lib/billing/service-fee.ts`), **bukan** dicatat manual Admin (walau Admin bisa override, lihat di bawah).
- `UNIQUE(merchant_id, period_start)` — pengaman idempotensi, sama pola dengan `payouts.UNIQUE(merchant_id, period_date)`: aman kalau cron ke-trigger dua kali untuk periode yang sama.
- `amount` = `SUM(orders.platform_fee_snapshot)` Pesanan `qris_pribadi` (`payments.provider = "qris_pribadi"`, difilter dari `payments` milik Pesanan itu sendiri — BUKAN `merchants.payment_mode` saat ini, supaya Pesanan lama tetap tertagih meski Lapak-nya sudah dipindah Admin balik ke `gateway`) yang `paid_at`-nya jatuh dalam `[period_start, period_end)`. **Tidak ada kolom link** (`orders.service_fee_invoice_id`) — akrual selalu dihitung dari rentang waktu, bukan penandaan per-baris.
- `due_at` = `period_end` (jatuh tempo langsung saat periode tutup, tanpa buffer tambahan — keputusan User). Kalau `belum_lunas` dan `due_at` sudah lewat `platform_config.service_fee_grace_period_days` hari → Lapak **dikunci** dari Pesanan baru (`isMerchantOrderingLocked`, dihitung **lazy**, bukan kolom flag — lihat [ARSITEKTUR-SISTEM.md](ARSITEKTUR-SISTEM.md#kedaluwarsa-pesanan)).
- `provider`/`reference_id`/`qr_string` = charge Midtrans (atau mock) untuk Pedagang bayar **balik** ke Aplikator — arah kebalikan dari `payments` (Pembeli→Pedagang/Aplikator). `reference_id`/`qr_string` di-null-kan lagi kalau charge `expired`/`failed` (webhook), supaya cron generate charge baru di run berikutnya.
- Webhook pembayaran tagihan **berbagi 1 route** dengan webhook Pesanan Pembeli (`POST /api/webhooks/payment`) — akun Midtrans cuma dukung 1 Notification URL global. Dibedakan lewat prefix `order_id` = `svcfee-<uuid tagihan>` (vs UUID Pesanan biasa).
- `status`: `belum_lunas` → `lunas` (webhook sukses ATAU override manual Admin, `paid_at` diisi) / `dibatalkan` (koreksi Admin, mis. sengketa periode, `void_reason` wajib diisi).

### `platform_config` (Konfigurasi Aplikator)
- Disimpan sebagai key-value dengan riwayat (`effective_from`) supaya bisa dilacak kapan Biaya Layanan berubah — jangan **update in place**, tapi **insert baris baru** dan pakai baris dengan `effective_from` terbaru yang `<= now()` sebagai nilai aktif.
- Key: `platform_fee_amount` (default `1000`), `order_expiry_minutes` (default `15`), `qris_mdr_bps` (Fase 6, default `70` = 0,70%) — MDR **tidak** memengaruhi kalkulasi Pesanan (ditanggung Aplikator); dipakai **hanya** untuk mengestimasi margin bersih Aplikator (`Biaya Layanan − estimasi MDR`) di laporan `/admin/payouts`. Fase 7: `service_fee_billing_cycle_days` (default `7`) & `service_fee_grace_period_days` (default `3`) — panjang siklus tagihan & masa tenggang sebelum Lapak `qris_pribadi` dikunci.

### `sessions` (Sesi login Pedagang — Fase 3)
- Mekanisme konkret dari "identitas Pedagang dari sesi" yang disebut di §Keamanan Multi-tenant di bawah — lihat implementasi di `src/lib/auth/session.ts`.
- `token_hash`: **SHA-256 dari token bearer acak** (32 byte) yang disimpan di cookie `HttpOnly` klien — token mentah **tidak pernah** disimpan di DB, supaya kebocoran baris tabel ini tidak otomatis jadi kebocoran sesi aktif.
- Tidak ada job cleanup baris kedaluwarsa — sama seperti filosofi kedaluwarsa Pesanan ([ARSITEKTUR-SISTEM.md](ARSITEKTUR-SISTEM.md#kedaluwarsa-pesanan)): cukup difilter `expires_at > now()` saat dibaca (lazy), volume rendah di skala MVP.
- Logout = hapus baris (bukan cuma hapus cookie klien) — sesi benar-benar revoked di server.

### `admin_sessions` (Sesi login Admin — Fase 4)
- Tabel **terpisah** dari `sessions` (bukan tabel polimorfik dengan kolom nullable) — `merchants`/`admins` sudah sengaja dipisah sejak awal (bukan `users`+role tunggal), jadi sesi mereka juga dipisah supaya tidak butuh `CHECK` constraint tambahan untuk dua domain yang memang berbeda. Mekanisme identik `sessions` (token bearer acak di-hash SHA-256, cookie `HttpOnly` terpisah bernama `mygerai_admin_session` — beda dari `mygerai_session` Pedagang supaya keduanya bisa aktif berdampingan di browser yang sama). Lihat implementasi di `src/lib/auth/admin-session.ts`.
- Admin **tidak** punya gate status seperti `merchants.status === "approved"` — begitu password cocok, sesi langsung dibuat (Admin = akun internal, dibuat manual, lihat [TEKNOLOGI.md §Autentikasi](TEKNOLOGI.md#autentikasi)).

## Keamanan Multi-tenant (Isolasi Level Aplikasi)

> **Perubahan arsitektur (2026-09-05):** MyGerai pindah dari rencana awal Supabase Cloud ke **PostgreSQL self-hosted** (server Garuda milik User, lewat Dokploy + Cloudflare Tunnel — lihat ADR di [ARSITEKTUR-SISTEM.md](ARSITEKTUR-SISTEM.md)). Konsekuensinya: tidak ada lagi PostgREST/`anon`/`authenticated` role yang membuat browser bisa konek langsung ke database seperti model Supabase — **satu-satunya jalur ke database adalah kode server tepercaya** (Server Action & Route Handler Next.js, pakai satu koneksi Postgres dengan hak akses penuh). Karena itu isolasi antar Lapak **tidak lagi ditegakkan lewat Row Level Security**, tapi wajib ditegakkan di kode aplikasi. Bagian ini menggantikan pendekatan RLS yang sebelumnya direncanakan di sini.

Aturan wajib (ground truth, jangan diubah tanpa update dokumen ini):
- Setiap fungsi di `src/server/*.ts` (Server Action) yang membaca/menulis `products`, `orders`, `order_items`, atau `payments` milik Pedagang **wajib** menerima identitas Pedagang yang sedang login dari sesi (bukan dari parameter yang dikirim klien) dan memfilter query dengan `WHERE merchant_id = <id dari sesi>` — **tidak boleh** ada query ke tabel-tabel ini tanpa filter kepemilikan eksplisit.
- Endpoint/Server Action yang dipanggil Pembeli (tanpa akun) hanya boleh: `SELECT` `products` berstatus `available` milik satu Lapak yang sedang dibuka (dari `slug` di URL), dan `INSERT` ke `orders`/`order_items` dengan `merchant_id` & harga yang divalidasi ulang di server (lihat [ARSITEKTUR-SISTEM.md](ARSITEKTUR-SISTEM.md)) — tidak pernah `SELECT` bebas ke seluruh tabel `orders`.
- Halaman status Pesanan Pembeli (`/pesanan/[orderId]`) mengandalkan `orders.id` (UUID v4, praktis tidak bisa ditebak) sebagai "kredensial" akses — di-query langsung by primary key lewat Server Component/Route Handler, tanpa perlu akun/token tambahan. Ini aman *karena* Pembeli tidak pernah konek langsung ke database (tidak ada risiko enumerasi lewat client DB access seperti model Supabase `anon` key).
- Hanya Server Action bertanda "Admin" (dicek dari sesi login Admin lewat `getAdminSession()`) yang boleh membaca/menulis `platform_config` dan `payouts`, serta approve/reject `merchants` dan mengubah `merchants.payment_mode` (`setMerchantPaymentMode`, Fase 7) — diimplementasikan di `src/server/{config,payouts,merchants,service-fee-invoices}.ts` sejak Fase 4. Pengecualian: `getActivePlatformConfig()` sengaja tanpa gate Admin karena dipakai bareng alur checkout Pembeli dan tidak mengembalikan data sensitif.
- **Route Handler tanpa sesi (Fase 6/7)** — diautentikasi lewat cara lain, bukan cookie:
  - `POST /api/webhooks/payment` & `/api/webhooks/payout`: **wajib** verifikasi keaslian (Midtrans `signature_key` = `SHA512(order_id+status_code+gross_amount+ServerKey)`; Iris signature/challenge) **sebelum** menyentuh DB. Payload webhook = data tak tepercaya sampai terverifikasi ([RULES §7.2](RULES.md#7-keamanan)). `/api/webhooks/payment` juga menangani notifikasi tagihan Biaya Layanan (Fase 7, prefix `order_id` `svcfee-`) — 1 route dipakai bersama karena akun Midtrans cuma dukung 1 Notification URL global.
  - `POST /api/cron/disburse` & `POST /api/cron/bill-service-fee` (Fase 7): **wajib** cek header `Authorization: Bearer $CRON_SECRET` (konstanta env, dibandingkan `timingSafeEqual` lewat `verifyCronSecret()` di `src/lib/auth/cron.ts`). Tanpa itu → `401`, tidak menjalankan apa pun.
  - Semuanya menulis `orders`/`payments`/`payouts`/`service_fee_invoices` **lintas semua Lapak** (bukan difilter satu sesi) — justru karena itu autentikasi non-sesi di atas jadi satu-satunya gerbang; jangan tambah query tanpa memastikan gerbang itu lolos dulu.
- Data sensitif (`password_hash`, token, `MIDTRANS_SERVER_KEY`, `IRIS_API_KEY`, `CRON_SECRET`, dsb) **tidak pernah** ikut ter-return dari Server Action / Route Handler ke klien — mapping ke tipe hasil yang eksplisit (lihat [CODING-STYLE.md §Struktur Fungsi Server Action](CODING-STYLE.md#struktur-fungsi-server-action)).

**Kenapa bukan RLS lagi:** RLS Postgres bernilai tinggi ketika klien (browser) bisa konek langsung ke database dengan role terbatas (model Supabase `anon`/`authenticated` + PostgREST/Realtime) — di situ RLS jadi lapisan pertahanan utama. Di arsitektur self-hosted ini, browser **tidak pernah** menyentuh database sama sekali (Realtime pun lewat polling/SSE dari Route Handler, lihat [ARSITEKTUR-SISTEM.md](ARSITEKTUR-SISTEM.md)), jadi satu-satunya permukaan yang perlu diamankan adalah kode server itu sendiri. Menambah RLS di atas ini hanya menambah kompleksitas (perlu `SET LOCAL` session variable tiap koneksi) tanpa mengurangi risiko nyata — bertentangan dengan prinsip KISS ([RULES.md §4](RULES.md#4-prioritas-desain)). Kalau nanti skala membesar dan tim bertambah (risiko bug "lupa filter" naik), pertimbangkan lagi menambah RLS sebagai lapisan kedua.
