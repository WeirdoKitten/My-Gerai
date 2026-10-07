# API Mobile Pedagang — Kontrak `/api/mobile/v1`

> Kontrak REST untuk aplikasi Android Pedagang ([My-Gerai-Mobile](https://github.com/WeirdoKitten/My-Gerai-Mobile)). Dibuat di Fase 12a (2026-10-07). Keputusan arsitektur: ADR 2026-10-07 di [ARSITEKTUR-SISTEM.md](ARSITEKTUR-SISTEM.md). Dokumen ini **satu-satunya** sumber kontrak; repo mobile merujuk ke sini.
>
> Setiap endpoint adalah adaptor tipis di `src/app/api/mobile/v1/**` yang memanggil Server Action yang sama dengan dashboard web. Aturan bisnis, validasi, dan isolasi antar Pedagang **tidak** ditulis ulang di API.

## 1. Dasar

- **Base URL**: `<APP_URL>/api/mobile/v1`. HTTPS di staging/produksi.
- **Format**: JSON (`content-type: application/json`), kecuali upload foto (`multipart/form-data`, field `file`).
- **Tanggal**: string ISO 8601 (UTC). Aplikasi mengubahnya ke WIB untuk ditampilkan.
- **Uang**: bilangan bulat Rupiah. Aplikasi hanya menampilkan; semua perhitungan di server.
- **Tanpa CORS**: API dipakai aplikasi native, bukan browser.

## 2. Autentikasi

- Login → `token` (string acak 43 karakter). Kirim di setiap request: `Authorization: Bearer <token>`.
- Token = baris di tabel `sessions` dengan `client = mobile` (hanya hash SHA-256 yang disimpan, lihat [DATA-MODEL.md](DATA-MODEL.md#sessions-sesi-login-pedagang--fase-3)).
- **Umur 90 hari, bergeser**: setiap request yang valid saat sisa umur < 60 hari memperpanjang token ke 90 hari dari sekarang. Pedagang yang aktif tidak pernah logout sendiri. **Tidak ada refresh token.**
- Token tidak berlaku (`401`) kalau: logout, kedaluwarsa, atau Pedagang tidak lagi `approved` (di-suspend Admin). Aplikasi menghapus token lokal dan kembali ke layar login.
- **Cookie web tidak diterima** di API ini. Request tanpa header Bearer selalu `401`.
- Simpan token **hanya** di `expo-secure-store` (aturan repo mobile).

## 3. Format Respons

Sukses:

```json
{ "ok": true, "data": { ... } }
```

Gagal:

```json
{ "ok": false, "error": { "code": "validation", "message": "Nama Item wajib diisi." } }
```

| `code` | HTTP | Arti |
|---|---|---|
| `bad_request` | 400 | Ditolak aturan bisnis (contoh: status tidak bisa diubah) atau body bukan JSON |
| `unauthorized` | 401 | Token tidak ada/tidak berlaku |
| `forbidden` | 403 | Tidak diizinkan untuk jenis sesi ini |
| `not_found` | 404 | Data tidak ada atau bukan milik Pedagang ini |
| `validation` | 422 | Input tidak lolos validasi Zod di API |
| `rate_limited` | 429 | Terlalu banyak percobaan (login, daftar, upload) |
| `server_error` | 500 | Bug/gangguan server; detail hanya di log server |

- `message` selalu Bahasa Indonesia yang ramah pengguna dan **boleh ditampilkan apa adanya**.
- Data milik Pedagang lain bisa dibalas `400` atau `404` (tergantung pesan action). Aplikasi cukup memperlakukan keduanya sebagai "tidak bisa".
- Validasi input sebagian besar terjadi di Server Action, jadi kesalahan isi field bisa datang sebagai `400`, bukan `422`.

## 4. Endpoint

Tipe `data` merujuk ke tipe TypeScript di `src/types/` (sumber kebenaran bentuk field). Kolom "Auth": **-** = publik, **B** = Bearer wajib.

### Umum & auth

| Metode & path | Auth | Body | `data` |
|---|---|---|---|
| `GET /meta` | - | | `{ apiVersion: 1, minAppVersion }` (env `MOBILE_MIN_APP_VERSION`, default `0.0.0`) |
| `POST /auth/register` | - | `{ stallName, ownerName, category, phone, password }` | `{ message }`. Akun `pending`, tidak langsung login |
| `POST /auth/login` | - | `{ phone, password }` | Disetujui: `{ status: "approved", token }`. Belum/ditolak/nonaktif: `{ status: "pending" \| "rejected" \| "suspended", message }` tanpa token |
| `POST /auth/logout` | B | | `{}`. Token dicabut, token push perangkat ikut terhapus |
| `GET /me` | B | | `{ merchantId, slug, stallName, profile: MerchantProfileView }` |
| `PUT /devices` | B | `{ pushToken: "ExponentPushToken[...]" }` | `{}`. Daftarkan HP ini untuk push. Token yang terdaftar di akun lain dipindah ke akun ini |
| `DELETE /devices` | B | | `{}`. Hapus token push sesi ini |

### Pesanan

| Metode & path | Body | `data` |
|---|---|---|
| `GET /orders` | | `MerchantOrderListResult` (antrean aktif, sama dengan dashboard) |
| `GET /orders/history` | | `{ orders: MerchantOrderHistoryItem[] }` |
| `POST /orders/{orderId}/status` | `{ status }` (nilai enum `order_status`) | `{}` atau pesan. Transisi sah diperiksa server |
| `POST /orders/{orderId}/delivery-failed` | `{ reason: "tidak_bisa_dihubungi" \| "alamat_tidak_ditemukan" \| "lainnya", note? }` | `{}` |
| `POST /orders/{orderId}/mark-paid` | | `{}`. Hanya mode QRIS Pribadi, Pesanan `menunggu_pembayaran` |
| `GET /orders/{orderId}/receipt` | | `{ receipt: OrderReceiptView }`. Hanya Pesanan yang sudah dibayar |

Struk: aplikasi menyusun baris dan byte ESC/POS sendiri dari `receipt`, **harus identik** dengan `buildReceiptLines`/`encodeEscPos` di `src/lib/utils/receipt.ts`.

### Item & Lapak

| Metode & path | Body | `data` |
|---|---|---|
| `GET /products` | | `{ products: MerchantProductView[] }` |
| `POST /products` | field Item (`name`, `price`, `description?`, `costPrice?`, `stock?`, `photoUrl?`, `preOrderMinDays?`, `preOrderMaxDays?`) | `{ productId }` |
| `PATCH /products/{productId}` | semua field Item (seperti form web) | `{}` |
| `POST /products/{productId}/status` | `{ status: "available" \| "sold_out" }` | `{}` |
| `POST /products/photo` | multipart `file` (JPG/PNG/WebP, maks 3 MB) | `{ url }` untuk diisi ke `photoUrl` |
| `GET /products/{productId}/variants` | | `{ groups: ProductVariantGroupView[] }` |
| `PUT /products/{productId}/variants` | `{ groups: [{ name, options: [{ name, priceDelta? }] }] }` (ganti semua; `[]` = hapus varian) | `{}` |
| `GET /open-status` | | `MerchantOpenStatusView` (termasuk jadwal) |
| `POST /open-status` | `{ state: "open" \| "closed" }` | `{}` |
| `PUT /operating-hours` | `{ hours: [{ dayOfWeek: 0-6, openTime: "HH:mm", closeTime: "HH:mm" }] }` | `{}` |

Foto dikompres di HP sebelum upload (sisi terpanjang ±1280px). Server tidak me-resize.

### Profil, uang, dan lainnya

| Metode & path | Body | `data` |
|---|---|---|
| `GET /profile` | | `MerchantProfileView` |
| `PATCH /profile` | field profil (seperti form web) | `{}` |
| `POST /profile/photo` | multipart `file` | `{ url }` |
| `POST /profile/qris-photo` | multipart `file` | `{ url }` |
| `GET /delivery-settings` | | `MerchantDeliverySettingsView` |
| `PATCH /delivery-settings` | field pengaturan antar | `{}` |
| `GET /payment-settings` | | `MerchantPaymentSettingsView` (mode hanya diubah Admin) |
| `GET /qr-menu` | | `QrMenuView` |
| `GET /reports/sales?period=` | `period`: `hari_ini` \| `7_hari` \| `30_hari` | `MerchantSalesReport` |
| `GET /reviews` | | `MerchantReviewsPage` |
| `GET /service-fee-invoices` | | `{ invoices: MerchantServiceFeeInvoiceView[] }` |
| `GET /events` | | `{ events: MerchantEventInfo[] }` |

**Belum ada**: pencarian alamat/peta (geocoding). Cara peta di aplikasi native diputuskan saat Tahap 4 aplikasi ([BACKLOG.md](BACKLOG.md) Fase 12).

## 5. Push Notification

- Dikirim lewat **Expo Push Service** (`src/lib/push/`), sekali setiap Pesanan berpindah ke `dibayar` (titik tunggal `settleOrderPayment`: webhook Midtrans, polling status, simulasi, dan tandai lunas QRIS Pribadi). Gagal kirim tidak pernah menggagalkan pembayaran.
- Isi:

```json
{
  "title": "Pesanan baru lunas",
  "body": "Kode K7QX9MB4 · Rp25.000",
  "data": { "type": "order_paid", "orderId": "<uuid>" },
  "channelId": "pesanan",
  "priority": "high",
  "sound": "default"
}
```

- **Tanpa** nama, No. HP, atau alamat Pembeli (terlihat di layar kunci). Aplikasi mengambil detail lewat API setelah notifikasi diketuk.
- Aplikasi wajib membuat channel Android dengan id `pesanan`.
- Token yang ditolak Expo (`DeviceNotRegistered`) dihapus otomatis.
- Env: `PUSH_PROVIDER=expo` (staging/produksi) atau `log` (default; hanya mencetak ke log), `EXPO_ACCESS_TOKEN` (opsional, kalau "enhanced push security" diaktifkan di akun Expo).

## 6. Kompatibilitas & Versi

- **Boleh tanpa versi baru**: menambah endpoint, menambah field di respons, menambah field opsional di body.
- **Wajib hati-hati**: menghapus/mengganti nama field, mengubah arti nilai, membuat field body jadi wajib. Pilih salah satu: (a) buat `/api/mobile/v2`, atau (b) naikkan `MOBILE_MIN_APP_VERSION` setelah versi aplikasi baru tersedia di Play Store, supaya aplikasi lama meminta update.
- Rilis server **lebih dulu** daripada aplikasi yang memakai endpoint baru.
- Setiap perubahan kontrak: perbarui dokumen ini, CHANGELOG, dan tambah item penyesuaian di BACKLOG repo mobile ([DOKUMENTASI.md](DOKUMENTASI.md#aturan-lintas-repo-aplikasi-android)).

## 7. Pengujian

- Unit: `tests/unit/mobile-api.test.ts` (Bearer, perpanjangan token, pemetaan respons, klien Expo Push).
- E2E: `tests/e2e/mobile-api.spec.ts` (Playwright `request`): auth, isolasi antar Pedagang, alur Pesanan QRIS Pribadi sampai selesai, Item/varian/foto, buka/tutup, endpoint baca, cookie ditolak, logout.
