# Hasil Stress Test & Load Test MyGerai

> Dokumen referensi untuk pekerjaan peningkatan performa. Berisi kapasitas nyata aplikasi saat ini, bottleneck yang terbukti (dengan angka), dan daftar perbaikan berprioritas. Diuji 2026-10-05 pada branch `test/stress-test` (basis `main` @ `13a82d5`). Alat uji ada di [tests/stress/](../tests/stress/), data mentah di [tests/stress/results/](../tests/stress/results/).

## 1. Ringkasan

> **Status 2026-10-05:** sebagian besar temuan di dokumen ini sudah diperbaiki di branch `perf/optimasi`. Hasil sebelum/sesudah ada di [§8](#8-hasil-setelah-optimasi-2026-10-05). §1–§7 sengaja dibiarkan sebagai catatan kondisi awal (baseline).

**Kesimpulan:** aplikasi **tidak pernah kehilangan data dan tidak pernah membuat Pesanan rusak** di bawah beban berat (30.000 Pesanan beruntun ke satu Lapak: 0% gagal). Tetapi **kapasitas pengguna bersamaan rendah**, dan ada dua masalah yang bisa langsung berdampak di produksi:

1. **Halaman Admin `/admin/payouts` memuat SEMUA Pesanan sekaligus.** Dengan ~260 ribu Pesanan: 1 request = 61 detik, HTML 493 MB. Beberapa request bersamaan membuat server **crash kehabisan memori** (`JavaScript heap out of memory`). Ini terjadi dalam uji.
2. **Stok Item bisa oversell.** 300 Pembeli membeli Item berstok 50, **semua 300 lunas**, stok berakhir 0. Stok hanya dicek saat Pesanan dibuat dan baru dikurangi saat dibayar, tanpa penjagaan.

Kapasitas kira-kira (satu proses Node, data ~260 ribu Pesanan, laptop uji, lihat §2):

| Beban | Kapasitas sebelum melambat | Penyebab utama |
|---|---|---|
| Pembeli menunggu di halaman bayar (polling tiap 4 dtk) | **± 120 Pembeli bersamaan** (±32 poll/dtk) | Render ulang gambar QR tiap poll (24–44 ms CPU) + query tanpa index |
| Pembuatan Pesanan | ±67 Pesanan/dtk | Cek Kode Pesanan unik melakukan seq scan + pool DB 10 koneksi |
| Dashboard Pedagang (polling tiap 5 dtk) | **± 95 Lapak aktif bersamaan** (±19 poll/dtk) | `orders.merchant_id` tanpa index |
| Halaman menu Pembeli | ±150 halaman/dtk | Render server (SSR) penuh tiap request, CPU 1 core |
| Halaman statis (`/lacak`) | ±2.350 halaman/dtk | Pembanding: halaman yang di-cache |

Beban campuran realistis selama 5 menit (1.000 Pembeli menunggu bayar + 25 Pesanan baru/dtk + 200 Lapak membuka dashboard + 50 buka menu/dtk) membuat **semua halaman melambat ke 33–60 detik**. Artinya aplikasi praktis tidak bisa dipakai.

Uji coba menambah 5 index database saja (tanpa mengubah kode) sudah menaikkan throughput 60–80% dan memulihkan dashboard 200 Lapak dari p50 4,4 detik ke 30 ms (§5).

## 2. Lingkungan & Metode

| Aspek | Nilai |
|---|---|
| Mesin | Laptop Intel i5-1240P (16 thread), RAM 16 GB, Windows 11 |
| Server | `next build` + `next start` (mode produksi, **1 proses Node** seperti di Docker). `NODE_ENV=production`, `PAYMENT_PROVIDER=mock` |
| Database | PostgreSQL 18.4 lokal, konfigurasi bawaan (`shared_buffers` 128 MB, `max_connections` 100). Pool `postgres.js` bawaan aplikasi: **10 koneksi** |
| Data | 200 Lapak (1 Lapak "ramai" `stress-hot`, 20 Lapak QRIS pribadi), 2.000 Item, **200.000 Pesanan historis** di-seed, tumbuh jadi **±260.000 Pesanan / ±560.000 baris `order_items`** selama uji |
| Pembangkit beban | Skrip Node sendiri tanpa dependency ([tests/stress/lib.mjs](../tests/stress/lib.mjs)), model *closed-loop*: CCU = jumlah pengguna virtual yang terus mengirim request. Server Action dipanggil lewat HTTP persis seperti browser (header `Next-Action`). Tiap Pembeli virtual memakai IP berbeda (`x-forwarded-for`) agar tidak kena rate-limit per IP |
| Ukur | Latensi p50/p95/p99, throughput (rps), error, CPU & RAM proses server, koneksi Postgres (sampel tiap 2 dtk) |

**Batasan yang perlu diingat saat membaca angka:**

- Pembangkit beban, server, dan Postgres berjalan di **satu laptop**. Server Node hanya memakai ±1,3 core dari 16, jadi persaingan CPU kecil, tetapi angka absolut di server Garuda bisa berbeda. **Rasio dan bottleneck-nya yang penting**, bukan angka mutlaknya.
- Payment memakai Mock. Midtrans sungguhan menambah 1 panggilan jaringan keluar per Pesanan (latensi tambahan, bukan beban CPU).
- Tanpa Cloudflare Tunnel. Error `ECONNREFUSED` di Windows terjadi saat antrean koneksi masuk (*listen backlog*) penuh. Di produksi, gejala yang sama kemungkinan muncul sebagai error 502/524 dari Cloudflare.

## 3. Hasil per Skenario

Kolom: CCU = pengguna bersamaan, rps = request selesai per detik, p50/p95 = latensi (ms), err = persen gagal.

### 3.1 Halaman Pembeli (GET)

| Halaman | CCU 10 | CCU 50 | CCU 250 | CCU 500 | CCU 2000 |
|---|---|---|---|---|---|
| `/menu/stress-hot` | 148 rps, p95 83 | 152 rps, p95 365 | 143 rps, p95 1.845 | err 40% | err 74% |
| `/pesanan/[id]` (status) | 71 rps, p95 224 | 65 rps, p95 868 | 67 rps, p95 4.170 | err 50% | err 83% |
| `/` (landing, dinamis) | 133 rps, p95 91 | 144 rps, p95 393 | 151 rps, p95 1.763 | err 43% | err 76% |
| `/lacak` (statis) | 2.301 rps, p95 6 | 2.372 rps, p95 26 | 2.381 rps, p95 123 | err 0,5% | err 1,6% |

- Throughput mentok sejak CCU 10–50, lalu latensi naik linear. Mulai CCU 500, koneksi baru ditolak.
- Halaman status hanya separuh kecepatan menu, karena query `order_items` by `order_id` melakukan seq scan ±560 ribu baris (61 ms/query, lihat §4 P1-1).
- Landing `/` 15× lebih lambat dari halaman statis padahal isinya hampir statis.
- RAM server naik ke 1,4 GB di CCU 2000 dan **tidak turun lagi** setelah beban selesai.

### 3.2 Brute force pembuatan Pesanan (`createOrder`)

| CCU | rps | p50 | p95 | err |
|---|---|---|---|---|
| 10 | 71 | 126 | 225 | 0% |
| 50 | 67 | 731 | 872 | 0% |
| 250 | 69 | 3.593 | 3.891 | 0% |
| 500 | 102 | 7.378 | 8.163 | 37% (ditolak) |
| 2000 | 123 | 12.944 | 29.201 | 46% (ditolak) |

**Volume besar:** 30.000 Pesanan (3 Item per Pesanan) ke **satu Lapak** dengan 200 CCU: semua sukses, **0% error, tanpa Kode Pesanan dobel**, 47 Pesanan/dtk, p50 4,5 dtk. Throughput turun dari 67 ke 47/dtk seiring tabel `orders` membesar, karena cek Kode Pesanan unik melakukan seq scan (§4 P1-2).

Total Pesanan dibuat lewat HTTP selama seluruh uji: ±60.000.

### 3.3 Alur Pembeli lengkap (buat → cek status → bayar → cek status)

| CCU | Alur selesai/dtk | p50 |
|---|---|---|
| 50 | 10 | 4,8 dtk |
| 200 | 11 | 17,6 dtk |
| 1000 | 32 (65% ditolak) | 86 dtk (p95) |

### 3.4 Pembeli menunggu pembayaran (polling status tiap 4 detik) — CCU paling realistis

Meniru [OrderStatusView.tsx](../src/components/buyer/OrderStatusView.tsx): tiap Pembeli memanggil `getOrderStatus` tiap 4 detik selama belum lunas.

| Pembeli bersamaan | Dibutuhkan | Tercapai | p50 | err |
|---|---|---|---|---|
| 500 | 125 poll/dtk | 32 poll/dtk | 10,5 dtk | 0,2% |
| 1.000 | 250 | 33 | 22,5 dtk | 0,2% |
| 2.500 | 625 | 41 | 47 dtk | 43% |
| 5.000 | 1.250 | 87 | timeout | 98% |
| 10.000 | 2.500 | 191 | timeout | 100% |

Server hanya sanggup ±32 poll/dtk, artinya **±120 Pembeli menunggu bersamaan** sudah membuat status Pesanan terlambat. Penyebab utama: setiap poll merender ulang gambar QR jadi PNG data URI (`QRCode.toDataURL`). Benchmark terpisah: **24 ms CPU per render** (payload mock), **44 ms** untuk payload sepanjang QRIS asli. Render ini memblokir event loop, jadi satu proses maksimal ±25–40 render/dtk. Midtrans di produksi juga mengirim `qr_string` yang dirender lokal, jadi masalah ini **sama di produksi**.

**Pemulihan setelah overload:** setelah beban 10.000 CCU berhenti, server butuh **±4–5 menit** untuk normal lagi. Request yang sudah ditinggal klien tetap diproses dan antre di pool DB.

### 3.5 Dashboard Pedagang

| Skenario | rps | p50 | p95 |
|---|---|---|---|
| Lapak ramai (6.018 Pesanan aktif), 1 tab | 4,9 | 190 | 269 |
| Lapak ramai, CCU 50 | 11,9 | 4.149 | 4.481 |
| **200 Lapak** masing-masing polling tiap 5 dtk (butuh 40 rps) | 19,4 | **4.376** | 5.391 |

200 Lapak aktif bersamaan sudah membuat Pesanan baru terlambat muncul ±4 detik di dashboard. Penyebab: `listMerchantOrders` memfilter `orders.merchant_id` tanpa index (seq scan) dan menghitung `count(*)` tiap poll.

### 3.6 Halaman berat (data historis besar, Lapak `stress-hot` ±130 ribu Pesanan)

| Halaman | 1 request | CCU 10 | CCU 50 |
|---|---|---|---|
| `/dashboard` | 263 ms | 9,6 rps, p50 1.036 | 9,2 rps, p50 5.260 |
| `/dashboard/riwayat` | 209 ms | 14,9 rps, p50 671 | 13,5 rps, p50 3.629 |
| `/dashboard/laporan?periode=hari_ini` | 529 ms | 2,2 rps, p50 4.481 | 2,2 rps, p50 18.720 |
| `/dashboard/laporan?periode=7_hari` | 501 ms | 2,1 rps | p50 19.038 |
| `/dashboard/laporan?periode=30_hari` | 509 ms | 2,0 rps | p50 20.157 |
| `/admin/merchants` | 249 ms (286 KB) | – | – |
| `/admin/invoices` | 395 ms (646 KB) | – | – |
| **`/admin/payouts`** | **61,4 detik, 493 MB HTML** | timeout | **server crash (OOM)** |

Laporan lambat sama untuk periode apa pun, karena beberapa agregat dihitung atas **seluruh histori** Lapak di setiap buka halaman ([src/server/reports.ts](../src/server/reports.ts), query `merchantPaid` tanpa batas waktu).

### 3.7 Uji kebenaran & keamanan di bawah beban

| Uji | Hasil |
|---|---|
| **Race stok**: 300 Pembeli bersamaan beli Item stok 50, lalu semua bayar | **GAGAL**: 300 Pesanan dibuat, 300 lunas, 300 Item terjual, stok akhir 0 → **oversell 250** |
| Kode Pesanan unik saat 30.000 Pesanan bersamaan | Lulus: tidak ada error/duplikat |
| Rate-limit `createOrder` dari 1 IP (batas 20/10 menit) | Lulus: 20 lolos, 10 ditolak |
| Rate-limit Lacak Pesanan dari 1 IP (batas 10) | Lulus: 20 dari 30 ditolak |
| Payload besar: `items` berisi 1.000 / 5.000 entri | **Diterima** (145 ms / 544 ms). Pesanan dengan 5.000 baris Item benar-benar tersimpan. 20.000 entri (1,2 MB) ditolak batas body 1 MB, tapi dengan **HTTP 500**, bukan 413 |
| Job tagihan mingguan Biaya Layanan (20 Lapak QRIS pribadi, 17 minggu tertunggak) | Lulus: 356 tagihan dalam 1,2 dtk; run kedua 77 ms tanpa tagihan dobel |
| Soak 5 menit beban campuran | Tidak ada kebocoran memori yang terlihat (RAM stabil ±600 MB), tetapi semua latensi 33–60 dtk (lihat §1) |

## 4. Temuan & Rekomendasi (berprioritas)

Bukti untuk setiap poin ada di §3. Lokasi kode mengacu ke kondisi `main` @ `13a82d5`. Perubahan yang menyangkut uang, stok, atau UX Pembeli **wajib dikonfirmasi User dulu** (lihat [RULES.md](RULES.md)).

### P0 — Bisa merusak produksi sekarang

**P0-1. `/admin/payouts` memuat semua Pesanan → server crash.**
`listOrdersForAdmin` ([src/server/orders.ts](../src/server/orders.ts)) menjalankan `findMany` tanpa `limit`, lalu seluruh hasilnya dikirim ke klien. Dengan data ±260 ribu Pesanan: 61 detik, 493 MB, OOM saat beberapa request bersamaan. Di produksi, cukup Admin me-refresh halaman beberapa kali setelah data tumbuh.
*Saran:* pagination di server (mis. 50 per halaman, urut `created_at` + index), filter tanggal/Lapak, dan hitung ringkasan saldo dengan `SUM ... GROUP BY` di SQL, bukan di JavaScript.

**P0-2. Oversell stok.** `createOrder` hanya membandingkan `qty` dengan `products.stock`; pengurangan stok baru terjadi di `settleOrderPayment` ([src/lib/payment/settle.ts](../src/lib/payment/settle.ts)) dengan `GREATEST(stock - qty, 0)`, yang diam-diam menyembunyikan kekurangan. Ini terjadi bukan hanya saat race: 300 Pesanan berurutan pun lolos semua selama belum ada yang dibayar.
*Pilihan (butuh keputusan User):* (a) **reservasi** stok saat Pesanan dibuat dengan update atomik `SET stock = stock - qty WHERE stock >= qty`, lalu kembalikan saat Pesanan kedaluwarsa/dibatalkan; atau (b) cek ulang saat pelunasan, dan Pesanan yang sudah dibayar tapi kehabisan stok ditandai untuk refund/konfirmasi Pedagang. Opsi (a) lebih sederhana untuk Pembeli, tetapi stok bisa "terkunci" sampai 15 menit oleh Pesanan yang tidak dibayar.

**P0-3. Render ulang QR di setiap poll status.** `getOrderStatus` memanggil `QRCode.toDataURL` (24–44 ms CPU) untuk setiap poll 4 detik selama Pesanan belum lunas. Ini plafon kapasitas utama (±120 Pembeli menunggu).
*Saran (pilih salah satu, berurutan dari paling murah):* kirim QR hanya di render pertama halaman, poll berikutnya cukup status (P1-4); atau cache data URI per Pesanan (render sekali saat `createOrder`); atau render QR di browser Pembeli dari `qr_string`.

### P1 — Bottleneck terbesar (perbaikan murah, dampak besar)

**P1-1. Index database yang hilang.** PostgreSQL tidak otomatis membuat index untuk foreign key. Terbukti seq scan:

| Query | Waktu sekarang | Dipakai di |
|---|---|---|
| `order_items WHERE order_id = ?` | 61 ms (seq scan 560 ribu baris) | halaman status, polling, pelunasan, dashboard, riwayat |
| `orders WHERE merchant_id = ? ... ORDER BY created_at` | 69 ms | dashboard, riwayat, laporan |
| `orders WHERE order_code = ?` | 48 ms | **setiap** `createOrder`, Lacak Pesanan |
| `order_item_variant_selections WHERE order_item_id IN (...)` | kecil sekarang, tumbuh bersama Pesanan bervarian | semua tampilan Pesanan |
| `products WHERE merchant_id = ?` | 1 ms (kecil) | menu, `createOrder` |

*Saran:* migrasi index `order_items(order_id)`, `orders(merchant_id, created_at)`, `order_item_variant_selections(order_item_id)`, `products(merchant_id)`. Hasil uji index sementara ada di §5.

**P1-2. Cek Kode Pesanan unik tidak memakai index.** `generateUniqueOrderCode` menjalankan `WHERE order_code = ?`, sedangkan index unik `orders_order_code_v2_idx` adalah index **parsial** (`WHERE length(order_code) = 8`). Planner tidak bisa memakai index parsial tanpa predikat yang sama, jadi setiap `createOrder` melakukan seq scan tabel `orders`. Hal sama untuk `findOrderForTracking`.
*Saran:* tambahkan `AND length(order_code) = 8` di kedua query, atau hapus cek awal dan cukup tangkap error unik (`23505`) lalu ulangi.

**P1-3. Pool DB hanya 10 koneksi.** `postgres(connectionString)` di [src/lib/db/client.ts](../src/lib/db/client.ts) memakai bawaan `max: 10`. Semua query mengantre di 10 koneksi ini, termasuk query dari request yang sudah ditinggal klien.
*Saran:* jadikan dapat dikonfigurasi lewat env (mis. `DATABASE_POOL_MAX`), sesuaikan dengan `max_connections` Postgres produksi. Tambahkan `statement_timeout` agar query macet tidak menahan pool.

**P1-4. Polling status Pesanan terlalu mahal.** Setiap 4 detik, `getOrderStatus` mengirim ulang seluruh data Pesanan, Item, varian, dan QR (±4,6 KB) dan menjalankan 5–6 query.
*Saran:* endpoint/aksi ringan yang hanya mengembalikan `status` (1 query by primary key). Data lengkap diambil ulang hanya saat status berubah. Pertimbangkan interval yang melambat (mis. 3 dtk → 10 dtk setelah 2 menit).

**P1-5. Polling dashboard Pedagang.** `listMerchantOrders` menjalankan `count(*)` dan memuat 100 Pesanan + Item setiap 5 detik per Lapak, walau tidak ada yang berubah.
*Saran:* setelah index P1-1, tambahkan pengecekan murah "ada perubahan sejak X?" (mis. `max(created_at)`/versi), dan kirim daftar lengkap hanya kalau berubah.

### P2 — Peningkatan berikutnya

**P2-1. Laporan menghitung seluruh histori.** Beberapa agregat di `getMerchantSalesReport` tanpa batas waktu: ±500 ms per buka, maksimal ±2 laporan/dtk untuk seluruh server. *Saran:* batasi ke periode yang dibutuhkan, cache hasil per Lapak selama 1–5 menit, atau tabel ringkasan harian.

**P2-2. Landing `/` dirender dinamis.** 133–151 rps vs 2.350 rps untuk halaman statis. *Saran:* jadikan statis/ISR (data yang berubah bisa di-*revalidate* berkala).

**P2-3. Halaman menu SSR penuh tiap request.** Mentok ±150 halaman/dtk karena CPU satu proses. *Saran:* cache katalog per Lapak dengan revalidasi berbasis tag saat Pedagang mengubah Item. Status buka/tutup & stok bisa diambil terpisah (sudah ada `CheckoutGate`).

**P2-4. Tidak ada batas jumlah `items` per Pesanan.** `checkoutItemSchema` membatasi `qty` (maks 50) tetapi `items` di `baseOrderSchema` hanya `.min(1)`. Satu request bisa membuat Pesanan dengan ribuan baris. *Saran:* `.max(...)` yang wajar (mis. 50 baris). Bodi > 1 MB menghasilkan HTTP 500; sebaiknya ditangani agar 413/pesan rapi.

**P2-5. Perilaku saat overload.** Tidak ada *load shedding*: request terus diterima sampai backlog penuh, request yang ditinggal klien tetap dikerjakan, pemulihan 4–5 menit. *Saran:* `statement_timeout` (P1-3), batas antrean, dan halaman/status "sedang ramai" yang cepat. Cache Cloudflare untuk aset/halaman statis.

**P2-6. Hanya 1 proses Node (±1,3 core terpakai dari 16).** Menjalankan beberapa instance (replica Dokploy atau `cluster`) melipatgandakan kapasitas CPU, **tetapi** rate-limiter in-memory ([src/lib/rate-limit/limiter.ts](../src/lib/rate-limit/limiter.ts)) dan beberapa asumsi lain dirancang single-instance (lihat [ARSITEKTUR-SISTEM.md](ARSITEKTUR-SISTEM.md)). Lakukan setelah P0/P1, karena P0/P1 jauh lebih murah.

**P2-7. Memori.** RAM server naik ke 1,4–1,8 GB saat beban puncak dan tidak dikembalikan setelahnya (perilaku heap V8). Soak 5 menit stabil di ±600 MB, jadi tidak terlihat kebocoran. Map bucket rate-limiter tidak pernah dibersihkan (tumbuh per IP unik); kecil, tetapi layak diberi pembersihan berkala. Batasi heap container (`--max-old-space-size`) sesuai RAM server agar crash terjadi terkendali dan container di-restart Dokploy.

**P2-8. Rate-limit per IP vs CGNAT (keputusan produk).** Batas 20 Pesanan/10 menit per IP bekerja sesuai rancangan. Namun operator seluler sering menempatkan banyak pelanggan di belakang satu IP publik (CGNAT). Di pasar yang ramai, Pembeli sah bisa ikut tertolak. Perlu dipantau di produksi sebelum diubah.

**P2-9. Konfigurasi Postgres.** Uji memakai konfigurasi bawaan (`shared_buffers` 128 MB). Cek konfigurasi Postgres di server Garuda. Aktifkan `pg_stat_statements` agar query lambat di produksi terlihat.

## 5. Eksperimen: Dampak Index Saja

Lima index ditambahkan **sementara** di database uji (tanpa perubahan kode, lalu dihapus lagi): `order_items(order_id)`, `orders(merchant_id, created_at)`, `orders(order_code)` (non-parsial, meniru perbaikan P1-2), `order_item_variant_selections(order_item_id)`, `products(merchant_id)`. Diukur dengan [tests/stress/compare.mjs](../tests/stress/compare.mjs) pada data yang sama:

| Skenario | Tanpa index | Dengan index | Perubahan |
|---|---|---|---|
| Halaman status Pesanan, CCU 50 | 65 rps, p50 762 ms | 104 rps, p50 459 ms | **+60%** |
| `createOrder`, CCU 50 | 67 rps, p50 731 ms | 113 rps, p50 437 ms | **+68%** |
| Dashboard Lapak ramai, CCU 50 | 11,9 rps, p50 4.149 ms | 21,3 rps, p50 2.295 ms | +79% |
| 200 Lapak polling dashboard | p50 4.376 ms | **p50 30 ms** | permintaan 40 rps terlayani penuh |
| Laporan 7 hari, CCU 10 | 2,1 rps, p50 4.395 ms | 3,7 rps, p50 2.603 ms | +76% |

Index adalah langkah pertama paling murah. Sisa bottleneck setelah index: render QR (P0-3), polling yang memuat data penuh (P1-4/P1-5), dan agregat laporan (P2-1).

## 6. Yang Belum Diuji

- Server produksi Garuda + Cloudflare Tunnel (hardware, latensi, batas koneksi Cloudflare).
- Midtrans sungguhan: latensi `createPayment`, lonjakan webhook, `getTransactionStatus` dari polling (dipanggil tiap poll untuk Pesanan berumur >10 dtk yang belum lunas — di produksi berarti **1 panggilan HTTP ke Midtrans per poll**, perlu diukur dan kemungkinan dibatasi).
- Unggah & sajikan foto (`/uploads/...`).
- Performa render di HP (sudah diaudit terpisah dengan Lighthouse, lihat [BACKLOG.md](BACKLOG.md) Fase 5).
- Lebih dari satu instance server.

## 7. Cara Menjalankan Ulang

Jalankan hanya terhadap database **lokal** (skrip menolak URL non-localhost). Database uji `mygerai_test` dipakai ulang; jalankan `pnpm db:seed` ke DB itu setelah selesai untuk mengembalikan data E2E.

```bash
# 1. DB uji + data stress (200 Lapak, 200.000 Pesanan historis, ±1,5 menit)
export DATABASE_URL="postgresql://mygerai:mygerai_dev_password@localhost:5432/mygerai_test"
pnpm db:migrate && pnpm db:seed
node tests/stress/seed.mjs            # opsi: STRESS_MERCHANTS, STRESS_HISTORY_ORDERS

# 2. Build & jalankan server produksi di port 3200 (terminal lain)
PAYMENT_PROVIDER=mock CRON_SECRET=stress-cron pnpm build
PAYMENT_PROVIDER=mock CRON_SECRET=stress-cron APP_URL=http://127.0.0.1:3200 pnpm start -p 3200 -H 127.0.0.1

# 3. Skenario (pilih satu/lebih, atau `all`; STRESS_QUICK=1 untuk versi singkat)
CRON_SECRET=stress-cron node tests/stress/run.mjs pages create bulk flow poll merchant heavy stock ratelimit payload billing soak

# 4. Pembanding cepat sebelum/sesudah perbaikan (5 skenario kunci, ±2,5 menit)
STRESS_LABEL=sesudah-index node tests/stress/compare.mjs
```

Catatan:

- Jalankan `poll`, `heavy`, dan `soak` **terpisah** dengan jeda, dan restart server di antaranya. Overload membuat antrean yang butuh beberapa menit untuk kosong, sehingga skenario berikutnya ikut terkontaminasi. Skenario `heavy` memuat `/admin/payouts` yang saat ini membuat server crash (P0-1).
- `bulk` dan `poll` menambah puluhan ribu Pesanan ke DB; angka antar-run hanya sebanding pada jumlah data yang sama.
- Hasil tersimpan di `tests/stress/results/<skenario>.json`. Hasil dokumen ini: `results/baseline/` (tanpa perbaikan) dan `results/with-index.json` (§5). Angka `heavy` di §3.6 dicatat dari log karena run-nya dihentikan setelah server crash.

## 8. Hasil Setelah Optimasi (2026-10-05)

Diimplementasikan di branch `perf/optimasi`. Daftar per butir ada di [BACKLOG.md](BACKLOG.md), keputusan arsitekturnya di [ARSITEKTUR-SISTEM.md](ARSITEKTUR-SISTEM.md) ADR 2026-10-05.

| Temuan | Perbaikan |
|---|---|
| P0-1 `/admin/payouts` OOM | Daftar Transaksi per halaman (50), `?halaman=N` |
| P0-2 Oversell stok | Reservasi saat pesan: stok − qty Pesanan lain yang masih menunggu bayar & belum kedaluwarsa, baris Item dikunci `FOR UPDATE` (keputusan User) |
| P0-3 Render QR tiap poll | Data URI QR di-cache per payload; klien mem-poll `getOrderStatusSummary` (status saja) dan baru mengambil data lengkap saat status berubah |
| P1-1 Index hilang | Migrasi `0017`: 8 index, termasuk `orders(merchant_id, status)` untuk antrean dashboard |
| P1-2 Kode Pesanan seq scan | Query menyertakan `length(order_code) = 8` |
| P1-3 Pool DB 10 | `DATABASE_POOL_MAX` (default 20) + `DATABASE_STATEMENT_TIMEOUT_MS` (default 15000) |
| P1-4 Polling status mahal | Lihat P0-3; tanya-status Midtrans dari polling di-cache 15 dtk per Pesanan |
| P1-5 Polling dashboard | Antrean aktif lewat 2 query ber-index tanpa JOIN ber-`OR` (60 ms → 0,2 ms per poll) |
| P2-1 Laporan | Cache 30 dtk per Lapak+periode, rekomendasi asisten 5 menit |
| P2-2/P2-3 Landing & menu | Cache poster QR, daftar Gerai (30 dtk), katalog menu (15 dtk, dikosongkan saat Item/varian/profil berubah), config platform (30 dtk) |
| P2-4 `items` tanpa batas | Maks. 50 baris per Pesanan |
| P2-7 Map rate-limiter | Bucket kedaluwarsa disapu maks. sekali per menit saat > 10.000 bucket |

Cache data hanya aktif saat `NODE_ENV=production` (lihat [TEKNOLOGI.md](TEKNOLOGI.md#performa--cache-2026-10-05)).

### 8.1 Perbandingan A/B di kondisi mesin yang sama

Selama pengujian, laptop sempat melambat ±2× (halaman statis `/lacak` turun dari ±2.400 ke ±980 rps). Karena itu versi lama dan baru diuji **bergantian dua ronde** di kondisi yang sama dengan [tests/stress/compare.mjs](../tests/stress/compare.mjs). Index `0017` dihapus saat versi lama diuji. Data: ±200.000 Pesanan. Angka = rata-rata dua ronde (`results/ab-sebelum-*.json`, `results/ab-sesudah-*.json`).

| Skenario | Sebelum | Sesudah | Perubahan |
|---|---|---|---|
| Kontrol `/lacak` (tidak diubah) | 974 rps | 998 rps | sama (validasi kondisi mesin) |
| Menu, CCU 50 | 63 rps | 87 rps | +38% |
| Landing, CCU 50 | 80 rps | 132 rps | +65% |
| Status Pesanan, CCU 50 | 56 rps | 118 rps | 2,1× |
| `createOrder`, CCU 50 | 51 rps | 164 rps | 3,2× (sudah termasuk reservasi stok) |
| 500 Pembeli polling tiap 4 dtk | p50 9.520 ms | p50 22 ms | 430× lebih cepat |
| 200 Lapak polling dashboard | p50 133 ms | p50 15 ms | 9× |
| Dashboard Lapak ramai, CCU 50 | 35 rps | 64 rps* | 1,8× |
| Laporan 7 hari, CCU 10 | 2,8 rps | 118 rps | 42× (cache) |
| `/admin/payouts`, 1 request | 47,8 dtk | 0,17 dtk | 280× |

\* Diukur sebelum perbaikan P1-5. Setelah P1-5: 637 rps, p50 78 ms (lihat §8.2).

### 8.2 Hasil akhir (mesin kembali normal, sebanding dengan §3)

Kontrol `/lacak` 2.572 rps (baseline §3: 2.372), jadi angka ini bisa dibandingkan langsung dengan §3. File: `results/ab-sesudah-final.json`, `results/poll-ringkas.json`, `results/soak.json`, `results/merchant.json`.

| Skenario | Baseline (§3) | Sesudah |
|---|---|---|
| Menu, CCU 50 | 152 rps | 169 rps |
| Landing, CCU 50 | 144 rps | 239 rps |
| Status Pesanan, CCU 50 | 65 rps | 217 rps |
| `createOrder`, CCU 50 | 67 rps | 237 rps |
| Pembeli menunggu bayar, 1.000 bersamaan | p50 22,5 dtk | p50 13 ms, 0% error |
| Pembeli menunggu bayar, 2.500 bersamaan | p50 47 dtk, 43% error | p50 545 ms, 8% koneksi ditolak |
| 200 Lapak polling dashboard | p50 4.376 ms | p50 10 ms |
| Dashboard Lapak ramai, CCU 50 | 11,9 rps (6.018 aktif) | 637 rps, p50 78 ms (±300 aktif) |
| Laporan 7 hari, CCU 10 | 2,1 rps | 167 rps |
| `/admin/payouts` | 61 dtk, 493 MB, crash OOM | 129 ms |
| **Soak 5 menit** beban campuran (§1) | p50 33–60 dtk, praktis lumpuh | **p50 90–235 ms, p95 < 1,4 dtk, error < 1%** |
| Race stok: 300 Pembeli vs stok 50 | 300 lunas, oversell 250 | **50 lunas, oversell 0** |
| Payload `items` 5.000 baris | diterima | ditolak (> 50) |

**Kapasitas baru (perkiraan, satu proses Node, laptop uji):**

| Beban | Sebelum | Sesudah |
|---|---|---|
| Pembeli menunggu bayar bersamaan | ±120 | **±2.000** |
| Lapak membuka dashboard bersamaan | ±95 | **> 200** (200 Lapak hanya p50 10 ms; belum dicari batasnya) |
| Pembuatan Pesanan | ±67/dtk | **±237/dtk** |

Di atas ±2.500 Pembeli bersamaan, laptop uji kehabisan port lokal (`EADDRINUSE`) sebelum server mencapai batasnya, jadi angka di atas itu tidak bisa diukur di mesin ini.

### 8.3 Sisa pekerjaan

- **Landing statis** — butuh `APP_URL` tersedia saat build (build arg Dokploy), karena QR pendaftaran dibuat dari `APP_URL`. Butuh keputusan User.
- **Halaman menu** masih dirender penuh per request (±170 rps, batas CPU satu proses). Langkah berikutnya: full-route cache/ISR dengan revalidasi tag.
- **Multi-instance** — melipatgandakan kapasitas CPU, tetapi rate-limiter & cache in-memory harus pindah ke store bersama (mis. Redis). Keputusan infra User.
- **Produksi** — cek konfigurasi Postgres, aktifkan `pg_stat_statements`, ukur ulang di server Garuda dengan Midtrans & Cloudflare.

