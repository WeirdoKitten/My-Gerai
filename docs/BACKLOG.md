# Backlog

> Aturan pakai: fitur baru (di luar bugfix kecil) harus masuk daftar ini dulu sebelum dikerjakan (lihat [RULES.md §5](RULES.md#5-alur-kerja-fitur)). Update centang `[x]` saat selesai, dan tambah entri di [CHANGELOG.md](../CHANGELOG.md) untuk perubahan yang berdampak ke ground truth. Pindahkan item ke bagian "Selesai" seperlunya kalau daftar aktif mulai panjang.

## Fase 0 — Fondasi (Ground Truth) ✅

- [x] Riset ESB / ESB Order sebagai inspirasi.
- [x] Susun seluruh dokumen ground truth (`docs/*`, `CLAUDE.md`, `README.md`, `CHANGELOG.md`).
- [x] Konfirmasi keputusan bisnis kunci: model settlement (Agregator), status badan usaha (perorangan), model onboarding Pedagang (self-service + approval), payment MVP disimulasikan.

## Fase 1 — Setup Proyek

- [x] Scaffold proyek Next.js (App Router) + TypeScript + Tailwind + Biome. — `pnpm build`/`pnpm exec tsc --noEmit`/`pnpm lint` lulus.
- [x] Setup PostgreSQL self-hosted di server Garuda (via Dokploy) + Cloudflare Tunnel + environment variables. — perlu akses server User (Dokploy dashboard/SSH). Panduan langkah demi langkah sudah diberikan ke User (sesi 2026-09-07); tunnel pakai `cloudflare/cloudflared` sebagai app Docker di Dokploy → `dokploy-traefik:80` (lihat docs.dokploy.com/docs/core/guides/cloudflare-tunnels).
- [x] Setup Drizzle ORM + migrasi awal berdasarkan [DATA-MODEL.md](DATA-MODEL.md). — skema (`src/lib/db/schema.ts`) & migrasi (`drizzle/0000..0002_*.sql`) digenerate & tervalidasi. Migrasi ke DB produksi kini **otomatis saat container start** via `docker-entrypoint.sh` + `src/lib/db/migrate.ts` (CHANGELOG 2026-09-07) — tidak perlu push manual lagi.
- [x] ~~Terapkan RLS policy dasar~~ — **digantikan**: isolasi multi-tenant sekarang di level aplikasi (bukan RLS database), lihat [DATA-MODEL.md §Keamanan Multi-tenant](DATA-MODEL.md#keamanan-multi-tenant-isolasi-level-aplikasi). Aturannya sudah didokumentasikan; penerapan konkret (filter di tiap Server Action) menyusul di Fase 2-4 seiring fitur ditulis.
- [x] Setup deployment aplikasi Next.js ke server Garuda via Dokploy (staging). — `Dockerfile` (multi-stage, `output: "standalone"`, ENTRYPOINT = migrasi otomatis + seed demo opsional) sudah dibuat & diverifikasi lokal (`docker build` + `docker run` konek Postgres: entrypoint jalan, `GET /` & `/menu/*` = 200, restart idempoten). Deploy sungguhan ke Dokploy + Cloudflare Tunnel masih perlu dikerjakan User — panduan detail sudah diberikan (sesi 2026-09-07). Env produksi: `DATABASE_URL`, `APP_URL`, `NODE_ENV=production`, opsional `SEED_DEMO=true` untuk staging.
- [x] Buat `.claude/settings.json` dengan permission dasar (izinkan command `pnpm`/`git` umum tanpa prompt berulang) — lihat [CLAUDE-SKILLS.md §Skill Bawaan vs Skill/Konfigurasi Custom](CLAUDE-SKILLS.md#skill-bawaan-vs-skillkonfigurasi-custom-claude).

## Fase 2 — Alur Inti Pembeli (dengan Payment Simulasi) ✅

- [x] Implementasi `PaymentProvider` interface + `MockPaymentProvider` ([TEKNOLOGI.md](TEKNOLOGI.md#payment-provider-abstraction)). — `src/lib/payment/`, QR di-generate via `qrcode` (data URI, tidak disimpan di DB).
- [x] Halaman katalog Lapak (`/menu/[stallSlug]`) — daftar Item, harga, foto. — hanya tampilkan Lapak `approved` & Item `available`.
- [x] Keranjang sisi klien (pilih Item, qty, catatan). — React Context + `useReducer` + localStorage (`src/lib/cart/`), tanpa dependency baru.
- [x] Halaman checkout (form Nama + ringkasan).
- [x] Server Action buat Pesanan (hitung ulang total di server, snapshot Biaya Layanan). — `src/server/orders.ts` `createOrder`; harga/produk selalu diambil ulang dari DB, tidak pernah dari klien (diverifikasi manual: manipulasi `price` di localStorage tidak memengaruhi total Pesanan sungguhan).
- [x] Halaman status Pesanan + tombol "Simulasikan Pembayaran Berhasil" + tampilan Kode Pesanan. — polling client-side 4 detik (bukan Supabase Realtime, sesuai ADR self-hosted).
- [x] Kedaluwarsa Pesanan otomatis (lazy check, lihat [ARSITEKTUR-SISTEM.md](ARSITEKTUR-SISTEM.md#kedaluwarsa-pesanan)). — diverifikasi manual (order_expiry_minutes=1, tunggu >1 menit, status otomatis `kedaluwarsa`).

**Diverifikasi nyata** (bukan cuma baca kode, sesuai RULES §8.1): Postgres 18 lokal (native Windows), migrasi & seed dijalankan, alur penuh dicoba di browser sungguhan (Playwright headless) — katalog, tambah ke keranjang, checkout (termasuk validasi Nama kosong), anti-manipulasi harga, pembuatan Pesanan, simulasi pembayaran, kedaluwarsa, halaman 404 custom. `tsc --noEmit`/`pnpm lint`/`pnpm build` lulus. `/security-review` dijalankan — tidak ada temuan.
**Belum**: unit test formal (sengaja ditunda ke Fase 5 sesuai scope backlog aslinya) dan rate-limiting checkout (BEST-PRACTICES.md menyebutnya, tapi security-review tidak menandainya sebagai risiko konkret untuk skala saat ini — dicatat sebagai kandidat Fase 5).

## Fase 3 — Alur Inti Pedagang ✅

- [x] Halaman daftar Pedagang baru (onboarding, status `pending`). — `/daftar`, nomor HP duplikat ditolak, slug unik otomatis (retry+suffix acak kalau tabrakan).
- [x] Login Pedagang (nomor HP + password, sesi custom — lihat [TEKNOLOGI.md §Autentikasi](TEKNOLOGI.md#autentikasi)). — hash `scrypt` bawaan Node, sesi DB-backed (tabel `sessions`), anti-enumeration (pesan & waktu respons generik).
- [x] Dashboard: kelola Item (tambah/edit/tandai habis). — `/dashboard/produk`, isolasi antar-Lapak diverifikasi (Item Lapak lain tidak pernah tampil/bisa diubah).
- [x] Dashboard: daftar Pesanan masuk real-time (polling/SSE custom — lihat [ARSITEKTUR-SISTEM.md](ARSITEKTUR-SISTEM.md)). — polling 5 detik, diverifikasi Pesanan baru muncul tanpa refresh manual.
- [x] Update status Pesanan (`diproses` → `siap_diambil` → `selesai`). — forward-only + optimistic lock (cegah race klik ganda/lompat status).
- [x] Generate & download/cetak QR Menu. — `qrcode` (reuse dari Fase 2), unduh via `<a download>` data URI, diverifikasi file PNG sungguhan ter-download & valid.

**Diverifikasi nyata**: Postgres lokal (migrasi tabel `sessions` + seed 3 Lapak fixture — approved/pending/approved-kedua untuk uji isolasi), alur penuh di browser sungguhan (Playwright) — registrasi, login (benar/salah/pending), guard dashboard tanpa sesi, CRUD Item + isolasi lintas-Lapak, Pesanan masuk→3x update status→selesai, unduh QR, logout (cookie & baris sesi terhapus), cek tidak ada `passwordHash`/`tokenHash` bocor ke client. **1 bug ditemukan & diperbaiki selama pengujian**: tombol aksi status Pesanan macet di "Memproses..." setelah update sukses (lupa reset state `submitting`) — lihat CHANGELOG.md. `tsc`/`lint`/`build` lulus. `/security-review` dijalankan — 1 temuan MEDIUM (rate-limiting login, dikecualikan aturan skill tapi tetap dicatat sebagai gap) + 1 LOW (validasi Zod `setProductStatus`, sudah diperbaiki langsung).
**Belum**: rate-limiting login/registrasi (kandidat Fase 5, sama seperti rate-limiting checkout Fase 2), unit test formal.

## Fase 4 — Admin & Konfigurasi ✅

- [x] Login Admin. — `/admin/login`, sesi terpisah (`admin_sessions` + cookie `mygerai_admin_session`, lihat [TEKNOLOGI.md §Autentikasi](TEKNOLOGI.md#autentikasi)), anti-enumeration sama seperti login Pedagang, diverifikasi hidup berdampingan dengan sesi Pedagang di browser yang sama.
- [x] Approve/reject Pedagang baru. — `listMerchantsForAdmin`/`approveMerchant`/`rejectMerchant` (`src/server/merchants.ts`), transisi hanya dari `pending` (optimistic lock via `WHERE status='pending'`), reject wajib isi alasan (`rejection_reason`) yang ditampilkan ke Pedagang saat mereka login.
- [x] Halaman konfigurasi: ubah `platform_fee_amount`, `order_expiry_minutes` (dengan histori, lihat [DATA-MODEL.md](DATA-MODEL.md#platform_config-konfigurasi-aplikator)). — `/admin/config`, hanya insert baris untuk key yang nilainya berubah; **snapshot immutability diverifikasi nyata**: Pesanan yang dibuat sebelum perubahan config tetap menyimpan `platform_fee_snapshot` lama walau config berubah setelahnya.
- [x] Halaman daftar transaksi & Saldo Pedagang per Lapak. — `/admin/payouts`, saldo dihitung server-side (dua query `GROUP BY` terpisah digabung di JS, hindari fan-out JOIN).
- [x] Pencatatan Pencairan manual. — guard overpayment ditegakkan **di server** (bukan cuma atribut HTML `max`, diverifikasi dengan menghapus atribut tsb via JS lalu submit tetap ditolak server); dibungkus `db.transaction` + `pg_advisory_xact_lock` per-Pedagang untuk menutup race TOCTOU submit ganda (temuan `/security-review`, lihat CHANGELOG.md).

**Diverifikasi nyata**: migrasi `admin_sessions`+`rejection_reason` (`drizzle/0002_*.sql`) digenerate & diterapkan, seed diperbarui (akun Admin + 2 fixture Pedagang `pending` khusus uji approve/reject). Alur penuh dicoba di browser sungguhan (Playwright) — login Admin salah/benar, guard `/admin/*` tanpa sesi & dengan sesi Pedagang (bukti isolasi jenis sesi), approve 1 Pedagang (bisa login ke dashboard) & reject 1 Pedagang dengan alasan (pesan login berisi alasan spesifik, tidak dapat cookie sesi), config tanpa perubahan vs 1 perubahan (histori bertambah tepat 1 baris), **snapshot Biaya Layanan tidak berubah retroaktif** (dibuktikan dengan 2 Pesanan sebelum/sesudah perubahan config), saldo & pencairan (termasuk guard overpayment sisi server & uji race 2 submit bersamaan — tepat 1 yang berhasil setelah perbaikan), tidak ada `passwordHash`/`tokenHash` bocor di response Server Action atau bundle `.next/static`. `tsc --noEmit`/`pnpm lint`/`pnpm build` lulus. `/security-review` dijalankan — 1 temuan MEDIUM (race TOCTOU overpayment di `recordPayout`), **langsung diperbaiki** (transaksi + advisory lock) & diverifikasi ulang di browser.
**Belum**: rate-limiting login Admin (kandidat Fase 5, sama seperti Pedagang), unit test formal.

## Fase 5 — Pengujian & Pengerasan (Hardening) ✅

- [x] Unit test untuk kalkulasi harga, Biaya Layanan snapshot, kedaluwarsa. — `tests/unit/{order-calc,order-status,money}.test.ts` (Vitest, 24 test), kalkulasi Pesanan diekstrak ke `src/lib/utils/order-calc.ts` (fungsi pure, `totalForMerchant` di-clamp minimal 0 untuk kasus Item gratis + Biaya Layanan). Dibuktikan benar-benar menangkap bug (bukan tautologi): kode disabotase sebentar (`subtotal - fee` → `subtotal + fee`, `>` → `>=` di `isOrderExpired`), 6 test relevan gagal seperti diharapkan, lalu direvert.
- [x] E2E test (Playwright): alur checkout penuh (buyer) + alur terima pesanan (merchant). — `tests/e2e/order-flow.spec.ts`, database terisolasi (`mygerai_test`, lihat `.env.test.example`) via `tests/e2e/global-setup.ts`. Test kedua (alur Pedagang) sengaja meniru persis regresi bug nyata Fase 3 (tombol status macet di "Memproses...") supaya terdeteksi otomatis kalau terulang.
- [x] Tambahan (gap eksplisit Fase 2-4): rate-limiting pada `loginMerchant`/`registerMerchant`/`loginAdmin`/`createOrder`. — `src/lib/rate-limit/limiter.ts`, lihat [TEKNOLOGI.md §Autentikasi](TEKNOLOGI.md#autentikasi) untuk mekanisme & angka batas. Diverifikasi nyata via `tests/e2e/rate-limit.spec.ts` (6+ percobaan salah berturut → diblokir).
- [x] `/security-review` untuk seluruh alur pembayaran & auth (lihat [CLAUDE-SKILLS.md](CLAUDE-SKILLS.md)). — Dua lapis: diff Fase 5 sendiri + review manual terarah ke seluruh `lib/auth/`, `server/orders.ts` (utuh), `lib/payment/`, `server/merchants.ts` (utuh), `server/admins.ts` (utuh). 1 temuan HIGH (rate-limiter berbasis `x-forwarded-for` bisa dilompati klien yang memalsukan header — segmen pertama bisa disisipi klien, bukan segmen yang ditambahkan proxy tepercaya), **langsung diperbaiki** (prioritaskan `cf-connecting-ip` yang tidak bisa dipalsukan, fallback segmen terakhir `x-forwarded-for`) & diverifikasi ulang (E2E rate-limit tetap lulus). Sisa permukaan (sesi, password, isolasi data, TOCTOU payout Fase 4) diperiksa ulang menyeluruh — tidak ada temuan baru.
- [x] Audit performa halaman Pembeli (Lighthouse, lihat [BEST-PRACTICES.md](BEST-PRACTICES.md#performa)). — `/menu/[stallSlug]` diaudit Lighthouse sungguhan (skor Performance 96, LCP 2.7s, CLS 0, di bawah simulasi throttling mobile bawaan Lighthouse). `/checkout` & `/pesanan/[orderId]` butuh state (keranjang terisi/order nyata) yang tidak kompatibel dengan mode isolasi Lighthouse CLI — diukur lewat CDP Playwright dengan throttling manual setara "Slow 4G" + CPU 4x sesuai istilah dokumen ini: FCP ~230-300ms, load ~280-480ms untuk alur nyata Pembeli (menu→checkout→status Pesanan berurutan, cache Next.js antar-halaman terpakai wajar). Tidak ada temuan performa yang perlu diperbaiki — satu observasi minor (49 KiB unused JS dari bundel framework di `/menu`) dicatat, tidak ditindaklanjuti (overhead hydration wajar, bukan "cheap fix").

**Diverifikasi nyata**: `pnpm test` (24 test unit) & `pnpm test:e2e` (3 test E2E, termasuk regresi bug Fase 3 & rate-limit) hijau; `tsc --noEmit`/`pnpm lint`/`pnpm build` lulus di setiap tahap. `/security-review` dijalankan, 1 temuan HIGH diperbaiki & diverifikasi ulang. Audit Lighthouse dijalankan sungguhan (bukan diasumsikan), hasil dicatat di atas. Tidak ada item tersisa dari scope Fase 5 — seluruh 4 poin backlog asli plus gap rate-limiting yang diwariskan dari Fase 2-4 sudah tertutup.

## Fase Tampilan — Desain Sistem & Percantik UI ✅

> Ground truth: [DESAIN-SISTEM.md](DESAIN-SISTEM.md). Arah: hangat/menggugah selera (aksen oranye), terang saja (hapus semua `dark:`), mobile-first, sederhana. Dikonfirmasi User via AskUserQuestion 2026-09-07.

- [x] Tulis [DESAIN-SISTEM.md](DESAIN-SISTEM.md) (token warna/tipografi/spacing, resep komponen, aturan layout).
- [x] `globals.css` (`@theme` token) + swap font ke Plus Jakarta Sans + `body` base.
- [x] Komponen primitif `src/components/ui/` (Button, ButtonLink, Input, Textarea, Field, Card, Badge, OrderStatusBadge, Alert, QuantityStepper, PageHeader, EmptyState, Spinner, Wordmark, icons) + kerangka `AuthShell`/`DashboardShell`/`DashboardNav`.
- [x] Percantik halaman Pembeli: landing `page.tsx` + `menu` + `checkout` + `pesanan` + `not-found`.
- [x] Percantik Pedagang: layout dashboard + `dashboard` + `produk` + `login` + `daftar`.
- [x] Percantik Admin: layout + `merchants` + `config` + `payouts` + `login`.
- [x] Nol sisa `dark:`/`zinc-*`/`#000`. `tsc`/`lint`/`build`/`pnpm test` (24) lulus. Diverifikasi visual di browser (Playwright, desktop + mobile) — 2 bug ditemukan & diperbaiki (nav tab dobel-aktif di `/dashboard/produk`, input catatan sempit di mobile). Ground truth disinkronkan (CLAUDE.md, DOKUMENTASI.md, ARSITEKTUR-FOLDER.md, TEKNOLOGI.md, CHANGELOG.md).

## Profil Pedagang ✅ (nomor HP & password menyusul)

> Dimau User 2026-09-08: hapus nama Lapak dari header dashboard, ganti tombol "Profil".

- [x] Header dashboard Pedagang: nama Lapak dihapus, tombol **Profil** ditambah (di samping "Keluar").
- [x] `/dashboard/profil`: `getMerchantProfile`/`updateMerchantProfile` — Pedagang ubah **Nama Lapak, Nama Pemilik, Kategori, Info Rekening/E-wallet** sendiri. Nomor HP tampil read-only (slug/QR tidak berubah).
- [x] `DashboardNav`: tab "index" hanya aktif saat cocok persis (supaya `/dashboard/profil` tidak menyorot "Pesanan"). Diverifikasi nyata (edit tersimpan ke DB).
- [ ] Ubah **nomor HP** (menyentuh auth — mungkin perlu verifikasi) & **ganti password** — fitur terpisah, belum dikerjakan.

## Fase Stok Item ✅

> Dimau User (AskUserQuestion 2026-09-08). Migrasi `drizzle/0003_*.sql` (kolom `products.stock`, nullable).

- [x] `products.stock` opsional (`null` = tak terbatas). ProductForm dapat field "Stok"; `ProductListItem` menampilkan "· Stok N" (merah kalau 0).
- [x] `getStallCatalog` sembunyikan Item stok 0 (`or(isNull, gt(stock,0))`). `createOrder` tolak `qty > stock`.
- [x] `simulatePaymentSuccess`: kurangi stok `GREATEST(stock-qty,0)` dalam transaksi transisi `dibayar` (guard WHERE cegah pengurangan ganda). Diverifikasi: pesan 2x → stok 6→4; Item tak terbatas tetap `null`; over-order ditolak.
- [x] Seeder isi stok contoh (Bakso Halus 10, Mie Ayam Bakso 6). E2E (`order-flow`, `rate-limit`) diperbaiki untuk markup baru — 3/3 lulus. Ground truth: DATA-MODEL, PRD, ARSITEKTUR-SISTEM (ADR), CODING-STYLE, CHANGELOG.

## Fase Foto Item — Upload foto dari HP ✅ (foto Lapak menyusul)

> Dimau User (AskUserQuestion 2026-09-07). Plan mode dulu (`~/.claude/plans/wild-rolling-turtle.md`), lihat CHANGELOG 2026-09-08.

- [x] **Keputusan penyimpanan**: **volume Docker persisten** di Garuda (bukan R2). ADR di [ARSITEKTUR-SISTEM.md](ARSITEKTUR-SISTEM.md) 2026-09-08, baris "Storage foto" [TEKNOLOGI.md](TEKNOLOGI.md) diperbarui.
- [x] Field upload foto di `ProductForm` (pilih dari HP, preview, ganti, hapus). Resize di klien (`src/lib/upload/resize-image.ts`, tanpa `sharp`). `createProduct`/`updateProduct` + Zod terima `photoUrl` (regex kunci ke path upload sendiri).
- [x] Server `uploadProductPhoto`: auth Pedagang, rate-limit 30/10menit, batas 3 MB, validasi **magic-bytes** (JPG/PNG/WebP, tolak SVG), nama file `randomUUID`. Route Handler `src/app/uploads/[...path]/route.ts` menyajikan file (path-sanitized, `nosniff`).
- [x] Dockerfile: `mkdir /app/uploads` + `chown nextjs` + `ENV UPLOADS_DIR`. entrypoint `mkdir -p` idempoten. `.dockerignore`/`.gitignore`: `.uploads`.
- [x] `/security-review` dijalankan — tidak ada temuan HIGH/MEDIUM; 1 hardening kecil (`X-Content-Type-Options: nosniff`) diterapkan. Unit test `tests/unit/upload.test.ts` (magic-bytes + regex path).
- [x] Diverifikasi nyata: dev (upload via Playwright, file di `.uploads/`, edit Item tidak hilang, hapus foto) + `docker run` dengan named volume (tulis sebagai `nextjs`, sajikan, traversal→404, persist setelah restart). `tsc`/`lint`/`build`/`pnpm test` (31) lulus.
- [ ] **Langkah Dokploy (User)**: `mygerai-app` → Advanced → Volumes → Volume Mount (named, mis. `mygerai_uploads`) → Mount Path `/app/uploads`. **Wajib sebelum deploy versi ini**, kalau tidak foto hilang tiap redeploy.
- [ ] Foto Lapak (`merchants.photo_url`) — mekanisme sama, belum dikerjakan.

## Riwayat Pesanan Pedagang ✅

> Sebelumnya begitu Pesanan `selesai`/`kedaluwarsa`, ia langsung hilang dari dashboard tanpa jejak. Ini murni sisi **Pedagang** — Riwayat Pesanan **Pembeli** tetap di luar lingkup ([PRD.md §5](PRD.md#5-di-luar-lingkup-mvp-out-of-scope--dicatat-sebagai-ide-masa-depan-di-backlogmd), Pembeli tanpa akun).

- [x] `listMerchantOrderHistory` (`src/server/orders.ts`): Pesanan milik Lapak sendiri (identitas dari sesi login) berstatus akhir (`FINAL_ORDER_STATUSES` = `selesai`/`kedaluwarsa`/`dibatalkan`), terbaru dulu, dibatasi 50 (skala kaki lima — KISS). Tipe baru `MerchantOrderHistoryItem` (bawa uang: `subtotal`/`platformFeeSnapshot`/`totalForMerchant` + `completedAt`/`paidAt`), tanpa field internal (`merchantId` dst).
- [x] Halaman `/dashboard/riwayat` + `MerchantOrderHistoryList` — Server Component, read-only, tanpa polling. Kartu: Kode Pesanan + `OrderStatusBadge`, "Atas nama X · <tanggal>", daftar Item, lalu "Bagianmu <total_for_merchant>" (kalau `selesai`) atau "Nilai Pesanan <subtotal>" (kalau tidak); baris kecil "Total dibayar Pembeli … · Biaya Layanan …" hanya untuk `selesai`.
- [x] Tab **"Riwayat"** (ikon `HistoryIcon` baru) di `DashboardNav` → jadi 4 tab: Pesanan · Riwayat · Item · QR Menu.
- [x] `src/lib/utils/datetime.ts` — `formatDateTime` (`Intl.DateTimeFormat("id-ID")` medium+short), dipatok `timeZone: "Asia/Jakarta"` supaya timestamp yang dirender server (kontainer UTC) tetap tampil jam WIB.
- [x] Diverifikasi: `tsc`/`lint`/`build`/`pnpm test` (57, +2 `tests/unit/datetime.test.ts`) lulus; `pnpm test:e2e` (3) lulus — `order-flow` diperluas: sesudah "Tandai Selesai" → buka tab Riwayat → Pesanan muncul dengan badge "Selesai" + "Bagianmu". Cek visual browser (Playwright, mobile): 2 Pesanan `selesai` + 1 `kedaluwarsa` tampil benar.

## Laporan Penjualan + Asisten Rekomendasi (Pedagang) ✅

> Pedagang belum punya cara melihat performa Lapak. Fitur ini = versi **ringan** dari "Laporan analitik" (dulu Ide Masa Depan). Sisi **Pedagang saja** — laporan Admin & analitik mendalam tetap di luar lingkup. Asisten = **mesin aturan deterministik, bukan LLM** (keputusan User, AskUserQuestion 2026-09-09; [ARSITEKTUR-SISTEM.md](ARSITEKTUR-SISTEM.md) ADR 2026-09-09). **Tanpa perubahan skema** — query agregat read-only atas `orders`/`order_items`.

- [x] `src/server/reports.ts` — `getMerchantSalesReport(period)` (`"use server"`, identitas Lapak dari sesi). Query agregat (`sql`/`groupBy`/`mapWith(Number)` ala `payouts.ts`) paralel: ringkasan periode + periode sebelumnya (delta %), penjualan per hari, Item terlaris, dan agregat khusus asisten (per-Item 7h/30h + laku terakhir, per jam, per hari-dalam-minggu, pasangan co-occurrence). Filter penjualan = `PAID_ORDER_STATUSES` (diekstrak ke `order-status.ts`, dipakai bareng `payouts.ts`). Semua bucket waktu dipatok `Asia/Jakarta`.
- [x] `src/lib/report/insights.ts` — mesin aturan (fungsi pure, tanpa DB). 7 rule ber-ambang: `restock`, `item_mati`, `jam_ramai`, `hari_sepi`, `fokus_menu` (Pareto 80%), `sering_bareng`, `harga`. Gerbang data global: `< 20` Pesanan dibayar / riwayat `< 7` hari → `[]` (UI tampilkan pesan "kumpulkan data dulu"). `src/lib/report/period.ts` — resolusi periode + kunci tanggal WIB (pure, teruji).
- [x] Halaman `/dashboard/laporan` + `SalesReportView` (Server Component). Segmented control periode (`?periode=hari_ini|7_hari|30_hari`, default 7). Kartu "Rekomendasi Asisten" (maks 4, urut prioritas) di atas; grid 4 angka + delta; bar penjualan per hari (CSS, bukan library — konsul skill `dataviz`); tabel Item terlaris + bar % kontribusi.
- [x] Tab **"Laporan"** (ikon `ChartIcon`; kartu asisten pakai `LightbulbIcon`) di `DashboardNav`. Letak dikonfirmasi User (AskUserQuestion 2026-09-09).
- [x] **Bottom nav dirapikan** (permintaan User lanjutan): **QR Menu** dipindah dari tab ke **ikon header** (di samping ikon Profil) — QR = cetak sekali, tak perlu slot tab. Bottom nav jadi **4 tab** urut **Pesanan · Item · Riwayat · Laporan**.
- [x] `src/lib/db/seed-orders.ts` + `pnpm db:seed:orders` (dev, guard localhost, idempoten via penanda `buyerNote`) — ±150 Pesanan historis 30 hari dengan pola sengaja (Bakso Urat terlaris, Pangsit "mati", puncak makan siang, Rabu sepi, kombo Bakso Urat + Es Teh).
- [x] Diverifikasi: `tsc`/`lint`/`build`/`pnpm test` (85, +28: `report-insights` + `report-period`) lulus; `pnpm test:e2e` (3) lulus — `order-flow` diperluas cek tab Laporan (Omzet + pesan asisten-menunggu-data). Cek visual browser (Playwright, mobile) dengan `db:seed:orders`: ke-3 periode benar, delta ▲/▼ warna benar, 4 kartu asisten sesuai pola seed (restock Mie Ayam, jam 12–13 42%, Rabu sepi, kombo Bakso Urat+Es Teh).

## Harga Modal Item + Keuntungan di Laporan Penjualan ✅

> Permintaan User (2026-09-14): sebelumnya Item cuma punya harga jual, Pedagang tidak bisa lihat untung. Keputusan dikonfirmasi User (AskUserQuestion 2026-09-14): **opsional** (bukan wajib, supaya Item lama tidak perlu diisi ulang) + **di-snapshot per Pesanan** (konsisten dengan `price_snapshot`, lihat [RULES.md §6](RULES.md#6-uang--konfigurasi-bisnis)) supaya Keuntungan Pesanan lama tidak berubah retroaktif kalau harga modal diedit belakangan.

- [x] Migrasi `0006_loving_barracuda.sql`: `products.cost_price` + `order_items.cost_price_snapshot` (integer, nullable).
- [x] `ProductForm` — field "Harga Modal (Rp)" opsional; `ProductListItem` tampilkan "· Modal RpX" kalau diisi. `createProduct`/`updateProduct` (`src/server/products.ts`) + `product.schema.ts` ikut simpan/validasi.
- [x] `createOrder` (`src/server/orders.ts`) snapshot `product.costPrice` → `orderItems.costPriceSnapshot` saat Pesanan dibuat.
- [x] `getMerchantSalesReport` (`src/server/reports.ts`) — `profitInRange` baru: `SUM((price_snapshot - cost_price_snapshot) * qty)` hanya atas baris yang punya `cost_price_snapshot`; `summary.profitIncomplete = true` kalau ada Item terjual di periode itu yang belum punya harga modal. Kartu "Keuntungan" (+ delta %) di `SalesReportView`, dengan hint kalau data belum lengkap.
- [x] `BuyerProductView`/`getStallCatalog` **tidak** menyertakan `costPrice` — harga modal tidak pernah terkirim ke Pembeli.
- [x] `seed-demo.ts` + `seed-orders.ts` diisi contoh `costPrice` (termasuk 1 Item sengaja tanpa modal, untuk uji kasus "belum lengkap").
- [x] Diverifikasi: `tsc`/`lint`/`pnpm test` (91)/`build` lulus. **Alur nyata browser** (Playwright, dev DB lokal via `pnpm db:migrate`+`db:seed`): isi Harga Modal Bakso Halus (Rp12.000, modal Rp7.000) di `/dashboard/produk` → tersimpan & tampil "· Modal Rp7.000"; katalog Pembeli (`/menu/bakso-pak-budi`) dicek HTML mentahnya — tidak ada `costPrice`/kata "Modal". Pesanan 2x Bakso Halus + 1x Bakso Urat (Bakso Urat sengaja tanpa modal) → bayar (mock) → `/dashboard/laporan`: kartu **Keuntungan = Rp10.000** (persis `(12000-7000)*2`) + hint "Sebagian Item belum ada Harga Modal, keuntungan belum lengkap" tampil benar.
- [x] **Bug pra-existing ditemukan & diperbaiki (2026-09-14, di luar lingkup fitur Harga Modal di atas)**: `seed.ts`/`seed-demo.ts` dulu mengisi `photoUrl` Item dengan path statis (mis. `/img/menu/bakso.jpg`) yang tidak cocok `PRODUCT_PHOTO_URL_PATTERN` (`/uploads/products/<uuid>.<ext>`) — akibatnya `updateProduct` GAGAL validasi Zod ("Foto tidak valid.") untuk Item manapun yang masih pakai foto bawaan seed, Pedagang tidak bisa mengubah field apa pun pada Item itu. **Perbaikan**: `src/lib/db/seed-photo.ts` baru — `seedProductPhoto(filename)` menyalin foto demo statis (`public/img/menu/*.jpg`) lewat `saveProductPhoto` yang sama dipakai upload asli, menghasilkan `photoUrl` berbentuk `/uploads/products/<uuid>.jpg` yang valid. Dipakai di `seed.ts` & `seed-demo.ts` (import relatif, bukan alias `@/` — kedua file ini punya kendala impor berbeda: `seed-demo.ts` di-bundle esbuild mandiri utk produksi tanpa resolusi alias, `seed.ts` cukup jalan lewat `tsx` tapi tetap disamakan gaya importnya). Diverifikasi nyata: re-seed dev DB → foto tersalin fisik ke `.uploads/products/<uuid>.jpg` → Playwright ubah nama "Bakso Urat" → dialog tertutup normal, tanpa "Foto tidak valid.". `tsc`/`lint`/`pnpm test` (91) tetap lulus.

## Toggle Buka/Tutup Lapak + Jadwal Operasional ✅

> Permintaan User (2026-09-14): Pedagang tidak punya cara memberi tahu Pembeli kalau Lapak sedang tutup — Pembeli bisa checkout kapan saja selama Lapak `approved`. Keputusan dikonfirmasi User (AskUserQuestion 2026-09-14): **jadwal per hari boleh beda jam** (Pedagang yang atur sendiri, bukan seragam dipaksa sistem); **override manual boleh dipakai kapan saja** meski ada jadwal (mis. tutup dadakan bahan habis) — sementara, **reset otomatis di batas jadwal berikutnya**; saat tutup, **menu tetap terlihat Pembeli, cuma checkout yang dikunci** (konsisten pola "Lapak terkunci" tagihan telat yang sudah ada, bukan disembunyikan total).

- [x] Migrasi `0007_lethal_shocker.sql`: enum `merchant_manual_override` (`open`/`closed`) + `merchants.manual_override`/`manual_override_set_at` (nullable) + tabel baru `merchant_operating_hours` (`day_of_week` 0-6, `open_time`/`close_time`, `UNIQUE(merchant_id, day_of_week)`, tanpa baris = tutup hari itu).
- [x] `src/lib/schedule/evaluate.ts` — `evaluateSchedule` (pure): jendela sehari & lewat-tengah-malam, jadwal jarang (1 hari/minggu), tanpa jadwal = selalu buka. Reuse `wibDayKey`/`addDayKey` (`src/lib/report/period.ts`, `addDayKey` baru di-export). 14 unit test (`tests/unit/schedule-evaluate.test.ts`).
- [x] `src/lib/schedule/is-merchant-open.ts` — `getMerchantOpenState(merchantId)` gabungkan jadwal + override (lazy, tanpa cron, pola sama `isMerchantOrderingLocked`). Override valid hanya kalau `manualOverrideSetAt >= segmentStart` (segmen jadwal saat ini) — begitu lewat batas berikutnya otomatis basi.
- [x] `src/server/merchants.ts`: `getMerchantOpenStatus`, `toggleMerchantOpen`, `setMerchantOperatingHours` (replace-all, Zod `merchant-hours.schema.ts`). `src/server/products.ts`: `getStallOpenState` (buyer, tanpa sesi) + `getStallCatalog` sisipkan `merchant.isOpen`/`reopensAt`. `src/server/orders.ts` `createOrder`: defense-in-depth blok kalau tutup. **`clearMerchantOverride` + tombol "Ikuti Jadwal Lagi" (`ClearOverrideButton`) dihapus lagi (2026-09-14, permintaan User)** — notice override manual di `/dashboard/jadwal` dirasa tidak perlu; override tetap lepas otomatis di batas jadwal berikutnya (logika inti `getMerchantOpenState` tidak berubah), cuma jalan pintas hapus-manualnya yang hilang.
- [x] Pedagang: `OpenToggle` — awalnya ikon tunggal di header, **dipindah User (2026-09-14) ke kartu "Status Lapak" di paling atas halaman Pesanan Masuk** (`/dashboard`, di atas judul — kontrol harian utama) supaya header tetap ringkas & statusnya lebih terlihat/deskriptif (label + switch penuh, bukan cuma ikon warna). Kartunya diberi warna latar hijau/merah lembut (`bg-success/15`/`bg-danger/15` + ikon badge solid) sesuai status — **catatan implementasi**: komponen `Card` (`src/components/ui/Card.tsx`) hard-code `bg-surface`/`border-line`, dan `cn()` proyek ini (`src/lib/utils/cn.ts`) cuma gabung string (bukan `tailwind-merge`) — jadi override warna lewat `className` pada `<Card>` tidak reliable (menang-kalahnya tergantung urutan generate CSS Tailwind, bukan urutan class di JSX). `OpenToggle` karena itu pakai `<div>` sendiri (pola sama `Alert.tsx`), bukan `<Card>`. Halaman `/dashboard/jadwal` (`OperatingHoursForm`, urutan Senin→Sabtu→Minggu + status saat ini) ditautkan dari kartu di `/dashboard/profil`; **"Metode Pembayaran" ikut dipindah dari ikon header ke kartu link serupa di Profil** (`SettingsLinkRow`, dipakai bareng Jadwal Operasional) — header dashboard sekarang cuma QR Menu + Profil + Keluar.
- [x] Pembeli: banner "Lapak sedang tutup" (+ jam buka lagi) di `/menu/[stallSlug]` kalau `!isOpen` — katalog & tombol Tambah tetap jalan. `CartProvider` muat `isOpen` (pola sama `paymentMode`). `CheckoutGate` kunci Checkout dengan `EmptyState` kalau `!cart.isOpen`.
- [x] **Diubah lagi (2026-09-14, permintaan User)**: banner statis di atas diganti pop up (`ClosedStallNotice`, `Modal` `src/components/ui/Modal.tsx`) — muncul otomatis tiap kali `/menu/[stallSlug]` diakses saat Lapak tutup (state lokal `useState(true)`, tanpa persist, jadi muncul lagi tiap reload/kunjungan baru, bukan cuma sekali). `FloatingCartBar` juga dicegat di sisi menu: klik tombol Keranjang saat `!cart.isOpen` tidak lagi navigasi ke `/checkout`, `e.preventDefault()` lalu tampilkan pop up peringatan serupa — Pembeli tetap di halaman menu (defense-in-depth `CheckoutGate`/`createOrder` di atas tidak berubah). `CartProvider` nambah field `reopensAt` (sebelumnya dibuang, sekarang dipakai isi pop up).
- [x] Diverifikasi: `tsc`/`lint`/`pnpm test` (105, +14 `schedule-evaluate`)/`build` lulus. **Alur nyata browser** (Playwright): toggle tutup → banner Pembeli muncul (+ jam buka lagi dari jadwal) → tambah ke keranjang tetap bisa → checkout diblok "Lapak sedang tutup" (bukan form) → toggle buka lagi → isi jadwal Senin 00:00-23:59 → tersimpan, persist setelah reload → link "Jadwal Operasional" & "Metode Pembayaran" di Profil berfungsi. **Isolasi multi-tenant** dicek: toggle/jadwal Lapak kedua (`warung-cak-slamet`) tidak ikut berubah saat Lapak pertama ditoggle/dijadwalkan.

## Biaya Layanan dibebankan ke Pembeli ✅

> Keputusan User (AskUserQuestion 2026-09-09) — **hard switch**, bukan toggle. Biaya Layanan (Rp1.000) tidak lagi dipotong dari Pedagang; Pembeli bayar `subtotal + Biaya Layanan`, Pedagang terima harga Item penuh. Detail & alasan: [ARSITEKTUR-SISTEM.md](ARSITEKTUR-SISTEM.md) ADR 2026-09-09. **Tanpa migrasi/kolom** — `grand_total` = turunan `subtotal + platform_fee_snapshot`.

- [x] `src/lib/utils/order-calc.ts` — `calculateOrderTotals` kembalikan `totalForMerchant = subtotal` + `grandTotal = subtotal + fee`; helper `orderGrandTotal({subtotal, platformFeeSnapshot})`. Unit test `order-calc.test.ts` ditulis ulang (7 test; sabotase `+`→`-` → 5 gagal → revert).
- [x] `src/server/orders.ts` — `createPayment({ grossAmount: grandTotal })` + `payments.grossAmount = grandTotal`; `getOrderStatus` + `BuyerOrderStatusView` tambah `grandTotal`. `midtrans-provider`/`mock-provider`/webhook **tidak berubah** (value-agnostic).
- [x] Checkout Pembeli: `checkout/page.tsx` `async` + `getActivePlatformConfig()` → `CartSummary` (rincian Subtotal · Biaya Layanan · **Total**) + `CheckoutForm` (tombol "Buat Pesanan · Bayar RpX"). `OrderStatusView` — blok Subtotal / Biaya Layanan / **Total Dibayar**. Label netral "Biaya Layanan … layanan pesan lewat MyGerai" (bukan "QRIS").
- [x] Pedagang: `MerchantOrderHistoryList` baris kecil "Pembeli bayar `{grandTotal}` · Biaya Layanan …". Laporan: `SalesSummary.merchantShare` → `platformFeeTotal` + `buyerTotal`; tile "Bagianmu" → **"Ditagih ke Pembeli"** (hint "termasuk Biaya Layanan RpX"). Admin `TransactionList` — angka utama = `grandTotal`.
- [x] `src/lib/db/seed-orders.ts` — `totalForMerchant = subtotal`. Saldo Pedagang (`payouts.ts`) tak berubah (= Σ `total_for_merchant` = Σ `subtotal`).
- [x] Diverifikasi: `tsc`/`lint`/`build`/`pnpm test` (86) / `pnpm test:e2e` (3, `order-flow` + asersi "Biaya Layanan"/"Total Dibayar") lulus. Alur nyata browser: Item Rp12.000 → checkout "Total Rp13.000" → bayar → `payments.gross_amount = 13000`, `total_for_merchant = 12000`. Laporan "Ditagih ke Pembeli" = Omzet + Σ fee.
- [ ] **`/security-review`** alur pembayaran (menyentuh uang — [RULES §7](RULES.md)). _(dijalankan setelah commit — lihat CHANGELOG)_
- [ ] **User: konfirmasi framing regulasi** — "Biaya Layanan platform" vs surcharge MDR — ke konsultan/Midtrans **sebelum go-live produksi**. Kalau ternyata tidak boleh: balik ke model lama (fee dari Pedagang) atau jadikan toggle.

## Fase 6 — Payment Nyata (Midtrans) + Pencairan Otomatis ("Model B")

> Ground truth: [ARSITEKTUR-SISTEM.md](ARSITEKTUR-SISTEM.md) ADR 2026-09-08 (4 baris) + §Alur Data Pencairan Otomatis, [TEKNOLOGI.md §Payment Provider & Disbursement Provider Abstraction](TEKNOLOGI.md#payment-provider--disbursement-provider-abstraction), [DATA-MODEL.md](DATA-MODEL.md). Branch: `feat/payment-midtrans-model-b`. Keputusan uang dikonfirmasi User (AskUserQuestion 2026-09-08): MDR ditanggung Aplikator (tak pernah ke Pembeli), biaya transfer Iris ditanggung Pedagang, Pencairan harian tanpa ambang, Pencairan manual dihapus (di 6b).
>
> **Dipecah 6a / 6b (2026-09-08)**: akses portal Iris sandbox belum beres di sisi User → kerjakan **6a (payment)** dulu, **6b (Iris)** menyusul. Selama 6b belum jalan, **pencairan manual `/admin/payouts` + `recordPayout` DIPERTAHANKAN** (penghapusannya digeser ke 6b).

### Fase 6a — Payment Midtrans (QRIS) — KODE SELESAI, tinggal uji sandbox nyata

**Persiapan (User)**
- [ ] Ambil `Server Key` + `Client Key` **sandbox** dari `dashboard.sandbox.midtrans.com` → Settings → Access Keys.
- [ ] Deploy branch ke **app Dokploy staging terpisah** (bukan menimpa produksi) → catat domain.
- [ ] Set env staging: `PAYMENT_PROVIDER=midtrans`, `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION=false`.
- [ ] Midtrans dashboard → Settings → Configuration → Payment Notification URL = `https://<domain-staging>/api/webhooks/payment`.

**Skema DB (migrasi `0004_fixed_electro.sql`)**
- [x] `payments`: enum `provider` +`midtrans`; kolom `gross_amount`, `qr_string`, `expires_at` (semua nullable).

**Kode**
- [x] `PaymentProvider` interface baru (`src/lib/payment/types.ts`): `createPayment({orderId,grossAmount,expiryMinutes}) → {referenceId,qrString,expiresAt}`, `handleCallback` return `{referenceId,orderId,status}|null`, `getTransactionStatus?`. Factory `src/lib/payment/index.ts` (`getPaymentProvider`/`getPaymentProviderName`), fail-fast kalau `midtrans` tanpa `MIDTRANS_SERVER_KEY`.
- [x] `src/lib/payment/midtrans-provider.ts` — `createPayment` → `POST /v2/charge` (`payment_type: "qris"`, `acquirer: "gopay"`, `custom_expiry` = durasi kedaluwarsa kita), Basic Auth Server Key, timeout 10s. `handleCallback` verifikasi `signature_key` = `SHA512(order_id+status_code+gross_amount+ServerKey)` (`timingSafeEqual`), map status. `getTransactionStatus` → `GET /v2/{order_id}/status`.
- [x] `src/lib/payment/settle.ts` (modul biasa, BUKAN `"use server"`) — `settleOrderPayment` (transisi `menunggu_pembayaran → dibayar` + kurang stok, guard WHERE, idempoten) & `markPaymentTerminal`. Dipakai `orders.ts` **dan** webhook route. Sengaja bukan Server Action supaya tidak jadi RPC "tandai lunas".
- [x] `src/app/api/webhooks/payment/route.ts` — POST, verifikasi via `handleCallback`, cari `payments` by `order_id` (+cek `reference_id` cocok), `success` → `settleOrderPayment`, `expired`/`failed` → `markPaymentTerminal`. Signature invalid → 403; keaslian lolos tapi Pesanan tak ada (notif uji Midtrans / order lama) → 200 + log (bukan retry).
- [x] `createOrder`: `orderId` di-`randomUUID()` di awal → `provider.createPayment` **sebelum** transaksi DB (gagal → `{ok:false}`, tidak ada baris yatim) → transaksi insert `orders`+`order_items`+`payments`.
- [x] `getOrderStatus`: render QR dari `payments.qr_string` tersimpan (bukan charge ulang tiap poll — wart lama dihapus); reconcile via `getTransactionStatus` kalau Pesanan >10 dtk masih menunggu (backstop webhook telat); tambah `canSimulate` ke view.
- [x] `simulatePaymentSuccess` menolak kalau `getPaymentProviderName() !== "mock"`.
- [x] `OrderStatusView`: tombol simulasi hanya kalau `order.canSimulate`; kalau QR ada tapi bukan mock → teks "otomatis diperbarui setelah pembayaran diterima".
- [x] `CartSummary`: copy "termasuk Biaya Layanan" → "Kamu membayar persis jumlah ini".

**Verifikasi 6a**
- [x] Unit test `tests/unit/payment-midtrans.test.ts` (20 test): verifikasi signature valid/palsu/gross_amount-diubah/order_id-diubah/case-insensitive, peta 8 status, factory (default→mock, midtrans+key→midtrans, midtrans tanpa key→throw), bentuk baru mock. Dibuktikan menangkap bug (sabotase `safeEqualHex` → 3 test gagal → revert).
- [x] `pnpm test` (51) / `tsc --noEmit` / `pnpm lint` / `pnpm build` lulus. `pnpm test:e2e` (3) hijau — `webServer.env` tanpa `PAYMENT_PROVIDER` → mock, tombol simulasi tetap ada.
- [ ] **Uji sandbox nyata di staging** (butuh User selesaikan Persiapan): Pesanan → QRIS Midtrans tampil (tanpa tombol simulasi) → bayar via `simulator.sandbox.midtrans.com` → webhook → status `dibayar` + stok berkurang + muncul di dashboard. Uji juga: webhook `expire` → `payments.status='expired'`; POST signature palsu → 403; webhook dimatikan sebentar → reconcile-on-poll tetap menuntaskan.
- [ ] `/security-review` (payment + webhook) — jalankan setelah uji sandbox.

### Fase 6b — Pencairan Otomatis (Midtrans Iris) — DITUNDA (akses Iris)

**Persiapan (User)**
- [ ] Akses portal Iris sandbox (`app.sandbox.midtrans.com/iris/sessions/new`) / minta aktivasi ke `support@midtrans.com` → ambil `Creator` API key + set auto-approve.
- [ ] (sebelum produksi) Verifikasi ke Midtrans: akun perorangan bisa aktivasi Iris produksi; limit; tarif MDR nyata.

**Skema DB (migrasi `0005`)**
- [ ] `orders.payout_id` (FK nullable). `merchants`: ganti `payout_account_info` → `payout_bank_code` + `payout_account_number` + `payout_account_holder`.
- [ ] `payouts`: kolom `provider`, `period_date` (+`UNIQUE(merchant_id, period_date)`), `transfer_fee`, `net_amount`, `reference_id`, `beneficiary_*`, `failure_reason`; enum status → `pending|processing|completed|failed`.
- [ ] `platform_config`: seed `qris_mdr_bps` = `70`.

**Kode**
- [ ] `src/lib/disbursement/` — `types.ts` (`DisbursementProvider`), `mock-provider.ts`, `iris-provider.ts` (`validateBankAccount`, `createPayout`, `handleCallback`). Factory dari `DISBURSEMENT_PROVIDER`.
- [ ] `/dashboard/profil`: field rekening pencairan terstruktur + tombol validasi (Iris `validate_bank_account`). `/admin/merchants`: penanda Lapak yang info rekeningnya belum lengkap.
- [ ] `POST /api/cron/disburse` (guard `CRON_SECRET` via `timingSafeEqual`) — batch harian: per Lapak dengan Saldo > 0 & rekening valid → transaksi (buat `payouts` + link `orders.payout_id`) → `createPayout`. Idempoten via `period_date`.
- [ ] `POST /api/webhooks/payout` — callback status Iris → `completed`/`failed` (unlink Pesanan kalau gagal).
- [ ] `src/server/payouts.ts`: **hapus `recordPayout`** (manual) + form/komponen Admin terkait; Saldo Pedagang pakai formula `payout_id IS NULL`. `/admin/payouts` jadi read-only (Saldo + riwayat + estimasi margin Aplikator dari `qris_mdr_bps`).
- [ ] Scheduled Job di Dokploy memanggil `/api/cron/disburse` 1×/hari.

**Verifikasi 6b**
- [ ] Unit test: kalkulasi batch (idempotensi, unlink saat gagal), verifikasi callback Iris.
- [ ] Uji sandbox: `/api/cron/disburse` → payout `processing` → callback → `completed`; Saldo Lapak jadi 0; `/admin/payouts` menampilkan riwayat.
- [ ] `/security-review` (disbursement + cron + lintas-Lapak).

### Rilis produksi (setelah 6a + 6b lulus sandbox)
- [ ] Set `*_IS_PRODUCTION=true` + key produksi, webhook URL domain produksi, Scheduled Job produksi.
- [ ] Uji transaksi **produksi** nominal kecil. Pastikan tidak ada data `provider=mock` tercampur laporan produksi ([DATA-MODEL.md](DATA-MODEL.md#payments)).
- [ ] `SEED_DEMO` dimatikan di produksi.

## Fase 7 — QRIS Pribadi + Tagihan Biaya Layanan Mingguan ✅

> Client ingin Pedagang bisa pilih QRIS pribadi (cair instan, tanpa H+1 Midtrans) selain gateway. Masalah: platform tidak pegang uangnya, jadi Biaya Layanan tidak bisa dipotong otomatis. Keputusan bisnis dikonfirmasi User (AskUserQuestion, beberapa putaran, 2026-09-11): konfirmasi bayar manual ("Tandai Lunas" Pedagang, tanpa integrasi notifikasi otomatis), QRIS statis bebas milik Pedagang, tagihan pascabayar **mingguan**, grace period **3 hari** sebelum Lapak dikunci, dan **hanya Admin** yang boleh ganti mode pembayaran (bukan self-service Pedagang). Detail lengkap & alasan tiap keputusan: [ARSITEKTUR-SISTEM.md](ARSITEKTUR-SISTEM.md) ADR 2026-09-11.

**Skema DB (migrasi `0005_condemned_fenris.sql`)**
- [x] Enum baru `merchant_payment_mode` (`gateway`/`qris_pribadi`), `service_fee_invoice_status` (`belum_lunas`/`lunas`/`dibatalkan`). Extend `payment_provider` + value `qris_pribadi`.
- [x] `merchants`: kolom `payment_mode` (default `gateway`) + `qris_photo_url`.
- [x] Tabel baru `service_fee_invoices` (periode, amount, dueAt, status, provider/referenceId/qrString charge tagihan, paidAt, voidReason) + `UNIQUE(merchant_id, period_start)` (idempotensi cron).
- [x] `platform_config`: 2 key baru `service_fee_billing_cycle_days` (default 7) & `service_fee_grace_period_days` (default 3), configurable dari `/admin/config`.

**Kode**
- [x] `createOrder`: cabang `qris_pribadi` skip panggilan gateway sama sekali — Pembeli bayar persis `subtotal` (Biaya Layanan jadi piutang, bukan dipungut instan). `getOrderStatus`: render foto QRIS Pedagang sebagai QR, field baru `amountToPay`/`isQrisPribadi`. **Bug laten diperbaiki**: `canSimulate`/`sandboxQrUrl` dulu cuma cek provider global env, sekarang juga cek provider per-Pesanan (`payments.provider`) — mencegah Pesanan `qris_pribadi` salah tampil tombol simulasi di deployment mock.
- [x] `markQrisPribadiOrderPaid` (`src/server/orders.ts`) — aksi "Tandai Lunas" Pedagang, scoped sesi + kepemilikan Pesanan, cuma utk Pesanan `qris_pribadi`, panggil `settleOrderPayment` langsung (tanpa `PaymentProvider.handleCallback`). `listMerchantOrders` diperluas (JOIN `payments`) supaya Pesanan ini muncul di dashboard.
- [x] `setMerchantPaymentMode` (`src/server/merchants.ts`) — HANYA Admin, tolak switch ke `qris_pribadi` kalau `qrisPhotoUrl` masih kosong. Pedagang cuma unggah/kelola foto QRIS sendiri (`uploadQrisPhoto`) di halaman baru `/dashboard/pembayaran`.
- [x] `src/lib/billing/` (`period.ts` resolusi periode epoch-relative, `service-fee.ts` — `isMerchantOrderingLocked` lazy-computed dari tagihan `belum_lunas` yang lewat jatuh tempo+grace, `runWeeklyServiceFeeBilling` job akrual+charge). `POST /api/cron/bill-service-fee` (guard `CRON_SECRET`, pola sama seperti rencana `/api/cron/disburse` Fase 6b).
- [x] Webhook tagihan **berbagi 1 route** dengan webhook Pesanan (`/api/webhooks/payment`) — dibedakan lewat prefix `order_id` (`svcfee-`), karena akun Midtrans cuma dukung 1 Notification URL global (keputusan User).
- [x] Kunci Lapak: **tidak ada kolom "locked" tersendiri** — dihitung lazy di 2 titik (`getStallCatalog`, `createOrder`), mengikuti filosofi kedaluwarsa Pesanan. Sesi/dashboard Pedagang TIDAK ikut terkunci (`getMerchantSession` tidak diubah) — Pedagang tetap bisa bayar tagihan meski Lapak-nya terkunci dari Pesanan baru.
- [x] Halaman Admin baru `/admin/invoices` (akrual per Lapak `qris_pribadi` + riwayat tagihan + override manual "Tandai Lunas"/"Batalkan"). Kontrol ganti mode pembayaran ditambahkan ke `/admin/merchants` (lihat foto QRIS dulu sebelum switch).

**Verifikasi**
- [x] Unit test baru `tests/unit/billing-period.test.ts` (5 test, dibuktikan menangkap bug: `floor`→`ceil` disabotase → 3 gagal → revert). `pnpm test` (91 total) lulus.
- [x] E2E baru `tests/e2e/qris-pribadi.spec.ts` (4 test, Lapak kedua "Warung Cak Slamet" biar tidak bentrok dgn `order-flow.spec.ts`): Pedagang unggah foto QRIS → Admin switch mode (lihat preview foto dulu) → Pembeli checkout (**tanpa** baris Biaya Layanan, bayar persis subtotal, QR yang tampil = foto QRIS Pedagang, tombol simulasi TIDAK muncul) → Pedagang "Tandai Lunas" → Pesanan lanjut alur normal. `pnpm test:e2e` (7 total) lulus.
- [x] Verifikasi manual cron nyata (bukan cuma baca kode): `POST /api/cron/bill-service-fee` dgn Pesanan `qris_pribadi` lunas di periode yang sudah tertutup → tagihan ter-generate (`amount`/`dueAt`/`qrString` benar) → dipanggil ulang → idempoten (0 baris baru) → 401 kalau secret salah/kosong. Tagihan telat (mundur manual) → storefront terkunci dgn pesan yang benar → ditandai lunas → storefront otomatis terbuka lagi TANPA langkah "unlock" terpisah (membuktikan desain lazy-unlock).
- [x] `tsc --noEmit` / `pnpm lint` / `pnpm build` lulus di setiap tahap.
- [ ] **`/security-review`** — jalankan setelah commit (menyentuh uang, upload, webhook — Rule 8).

## Fase 8 — Lokasi GPS Lapak ✅ (UI sortir-jarak digantikan Fase 9)

> User minta Pembeli bisa lihat lokasi Lapak di landing page (section "Gerai Terdaftar") supaya tahu di mana lapaknya, sekaligus Lapak bisa "dikelompokkan" berdasarkan area — dikonfirmasi User (AskUserQuestion, 2026-09-17): metode grouping **otomatis by jarak GPS** (bukan label area manual), peta pakai **Leaflet + OpenStreetMap** (gratis, cocok skala kaki lima, bukan Google Maps berbayar), landing page **perluas showcase yang sudah ada** (bukan halaman direktori baru). Diwujudkan sebagai sortir jarak terdekat + filter radius dari lokasi Pembeli sendiri (client-side, opsional, tidak pernah jadi syarat). Ini juga menuntaskan item lama di §5 PRD yang sebelumnya menulis hal ini sebagai di luar-scope.
>
> **Update 2026-09-17**: setelah dipakai, User minta model pengelompokan yang berbeda (Admin yang tentukan area bernama, bukan Pembeli yang beri izin lokasi) — lihat **Fase 9** di bawah. Tombol "Urutkan jarak terdekat"/filter radius/badge jarak di `MerchantShowcase.tsx` yang dibangun di fase ini **sudah diganti total**. Skema `merchants.latitude`/`longitude` dari fase ini **tetap dipakai** (jadi input `findNearestArea` di Fase 9).

**Skema DB (migrasi `0009_same_zaran.sql`)**
- [x] `merchants`: kolom baru `latitude`/`longitude` (`doublePrecision`, nullable, tanpa default — baris lama otomatis `NULL` = lokasi belum diisi).
- [x] Migrasi via `pnpm db:generate` (review manual SQL-nya sebelum `pnpm db:migrate`) — murni 2x `ADD COLUMN`.

**Kode**
- [x] `updateMerchantProfileSchema` (Zod): tambah `latitude`/`longitude` opsional, range `-90..90`/`-180..180`, `.refine()` wajib diisi/dikosongkan bareng.
- [x] `getMerchantProfile`/`updateMerchantProfile`/`listApprovedMerchants` (`src/server/merchants.ts`) + tipe `MerchantProfileView`/`PublicMerchantListItem` (`src/types/merchant.ts`) — sertakan `latitude`/`longitude`.
- [x] `src/lib/utils/geo.ts` baru — `haversineDistanceKm`/`formatDistanceKm` (pure function).
- [x] `src/components/merchant/LocationMapPicker.tsx` baru (Leaflet, client-only via `next/dynamic({ssr:false})`) — klik/drag pin, tombol "Pakai lokasi saya sekarang" (`navigator.geolocation`), tombol "Hapus lokasi". Dependency baru: `leaflet` + `react-leaflet@^5` + `@types/leaflet`. Asset ikon marker dicopy ke `public/leaflet/` (fix bug ikon patah Leaflet+bundler).
- [x] `MerchantProfileForm.tsx` — field baru "Lokasi Lapak (GPS)" (opsional). **Bug aksesibilitas ditemukan+diperbaiki saat verifikasi manual**: field ini sengaja TIDAK pakai `<Field>` (yang selalu bungkus children dengan `<label>`) — `LocationMapPicker` berisi peta + 2 tombol sekaligus, kalau dibungkus `<label>` browser meng-assign nama aksesibilitas gabungan seluruh field ke tombol-tombol itu (kebukti lewat Playwright `getByRole` gagal menemukan tombol "Hapus lokasi"/"Pakai lokasi saya sekarang" sebelum fix).
- [x] `src/components/buyer/MerchantShowcase.tsx` baru — grid Lapak dipindah dari `src/app/page.tsx`, tombol "Urutkan jarak terdekat" (klik eksplisit, bukan auto-prompt), filter radius, Lapak tanpa lokasi tetap tampil (dideprioritaskan, bukan disembunyikan).

**Verifikasi**
- [x] Unit test baru `tests/unit/geo.test.ts` (4 test). `pnpm test` (109 total) lulus.
- [x] Manual (Playwright ad-hoc, bukan cuma baca kode): profil pasang pin via klik peta → simpan → reload → koordinat identik. Tombol "Pakai lokasi saya sekarang" (geolocation di-mock) → koordinat sesuai. Tombol "Hapus lokasi" → simpan → reload → kembali kosong. Landing page: tombol "Urutkan berdasarkan jarak terdekat" muncul & berfungsi (chip filter radius, tanpa error console) tanpa geolocation granted sekalipun (fallback graceful).
- [x] `tsc --noEmit` / `pnpm build` lulus. `pnpm lint` bersih untuk semua file yang disentuh Fase 8 (73 error pra-existing di file lain karena CRLF line-ending, tidak terkait Fase 8 — lihat catatan di commit).

## Fase 9 — Area Lapak (pengelompokan otomatis oleh Admin) ✅

> Penerus langsung Fase 8: User minta model pengelompokan area yang berbeda — **Admin** yang mendefinisikan Area bernama (titik pusat + radius, mis. "Baleendah"), lalu **sistem otomatis mengelompokkan** tiap Lapak ke Area yang mencakup koordinatnya, tanpa Pedagang perlu mengetik nama area dan tanpa Pembeli perlu memberi izin lokasi sama sekali. Dikonfirmasi User (AskUserQuestion, 2026-09-17): **mengganti total** UI sortir-jarak Fase 8 (bukan berdampingan); kalau Lapak masuk beberapa Area yang tumpang tindih, menang **Area yang titik pusatnya paling dekat**.
>
> **Update 2026-09-21**: chip "Terdekat" (geolocation) ditambahkan lagi sebagai **opsi tambahan** di samping Area bernama (lihat [CHANGELOG.md](../CHANGELOG.md)) — bukan pembalikan keputusan di atas. Area bernama tetap default & tidak butuh izin lokasi; "Terdekat" cuma minta izin kalau Pembeli sendiri yang klik chip-nya.

**Skema DB (migrasi `0010_friendly_maestro.sql`)**
- [x] Tabel baru `service_areas` (`name`, `centerLatitude`, `centerLongitude`, `radiusKm`, `createdAt`) — tanpa FK ke `merchants` (keanggotaan dihitung lazy).
- [x] Migrasi via `pnpm db:generate` (murni `CREATE TABLE`) ke **kedua** DB (`mygerai` dev + `mygerai_test` — dipelajari dari kelupaan yang sama di Fase 8, sempat bikin `pnpm test:e2e` gagal).

**Kode**
- [x] `src/lib/validation/service-area.schema.ts` baru — `serviceAreaSchema`/`saveServiceAreasSchema` (array, max 50 area).
- [x] `src/types/service-area.ts` baru — `ServiceAreaView`, `SaveServiceAreasResult`.
- [x] `src/server/service-areas.ts` baru — `listServiceAreas` (**publik, tanpa sesi**, dipakai landing page & Admin), `saveServiceAreas` (**Admin-only**, pola **replace-all** dalam transaction, sama seperti `setMerchantOperatingHours`).
- [x] `findNearestArea` baru di `src/lib/utils/geo.ts` — nearest-center tie-break untuk area tumpang tindih, `null` kalau tidak match/daftar kosong.
- [x] `listApprovedMerchants` (`src/server/merchants.ts`) hitung `areaId`/`areaName` per Lapak lewat `findNearestArea`; `PublicMerchantListItem` (`src/types/merchant.ts`) tambah kedua field itu (`latitude`/`longitude` tetap ada, tidak dipakai lagi di UI landing tapi tidak dihapus).
- [x] `LocationMapPicker.tsx` — prop opsional baru `radiusKm` (gambar `<Circle>` react-leaflet sebagai pratinjau cakupan), dipakai Admin, tidak mengubah pemakaian existing di `MerchantProfileForm`.
- [x] Admin baru: `/admin/areas` (`src/app/(admin)/admin/(dashboard)/areas/page.tsx`) + `ServiceAreaEditor.tsx`/`ServiceAreaManagerForm.tsx` (`src/components/admin/`, pola controlled-editor sama `ProductVariantEditor.tsx`) — tambah/hapus baris Area, satu tombol "Simpan Semua Area" untuk seluruh daftar. Nav baru "Area" (ikon `MapPinIcon` baru) di `(dashboard)/layout.tsx`.
- [x] `MerchantShowcase.tsx` dirombak total: buang state/tombol/logika sortir-jarak Fase 8, ganti chip filter per Area (`Semua`/nama Area/`Lainnya`) dihitung langsung dari `areaId`/`areaName` yang sudah menempel di data merchant (tidak butuh geolocation Pembeli sama sekali). Chip cuma muncul kalau ada minimal 1 Area. Kartu tampilkan `· <nama Area>` menggantikan badge jarak.

**Verifikasi**
- [x] Unit test baru di `tests/unit/geo.test.ts` untuk `findNearestArea` (tumpang tindih menang area terdekat, di luar semua radius → null, daftar area kosong → null). `pnpm test` (113 total) lulus.
- [x] Manual (Playwright ad-hoc): 2 Lapak demo dipasang lokasi berdekatan → Admin buat Area "Baleendah" mencakup keduanya → simpan → reload → area persisten → landing page tampilkan chip "Baleendah (2)" → klik memfilter tepat ke 2 Lapak itu, kartu menampilkan "· Baleendah". Admin hapus semua Area → landing page kembali ke grid polos tanpa baris chip (tanpa error console di semua langkah).
- [x] `pnpm test:e2e` (7 test lama, regresi) tetap lulus. `tsc --noEmit` / `pnpm build` / `pnpm lint` (file yang disentuh Fase 9) lulus.

## Panduan Onboarding Pedagang (Wizard Ringan) ✅

> Target pengguna Pedagang adalah pedagang awam (kaki lima/pasar). Dua celah UX di alur onboarding (PRD §6.2): (1) setelah `/daftar`, Pedagang tidak tahu status pendaftarannya sampai coba login dan dapat pesan error; (2) setelah `approved` & login pertama, Pedagang langsung lihat dashboard penuh tanpa arahan bahwa Lapak belum bisa dipakai Pembeli sebelum ada minimal 1 Item. Keputusan User (AskUserQuestion, 2026-09-17): **bukan** wizard/route terpisah — checklist/gate ringan di atas halaman yang sudah ada; status pending dapat **halaman URL tersendiri** (bisa dibuka ulang lewat reload/bookmark); akses dashboard **dikunci** ke `/dashboard/produk` sampai ada minimal 1 Item. Plan mode dulu (`~/.claude/plans/noble-conjuring-cake.md`).

- [x] Halaman baru `/daftar/status` (statis, tanpa query DB by phone — hindari enumeration) menjelaskan Lapak sedang ditinjau Admin. `RegisterMerchantForm` redirect ke sana (`router.push`) setelah `registerMerchant()` sukses, menggantikan pesan sukses sekilas di form.
- [x] `hasAnyProduct()` (`src/server/products.ts`) + guard 1 baris di tiap halaman dashboard **kecuali** `dashboard/produk` (`dashboard`, `riwayat`, `laporan`, `qr`, `profil`, `jadwal`, `pembayaran`) — redirect ke `/dashboard/produk` kalau Lapak belum punya Item sama sekali. `dashboard/produk/page.tsx` tampilkan `Alert` kecil yang menjelaskan kenapa diarahkan ke sana.
- [x] `ProductManager.tsx` — momen sukses khusus Item pertama (bukan Item ke-2 dst): modal "Item Pertama Ditambahkan" + link ke QR Menu, murni state client-side dari `products.length` sebelum refresh, tanpa perubahan server.
- [x] Update `docs/PRD.md` §6.2 (alur onboarding) + `docs/ARSITEKTUR-FOLDER.md` (baris route baru).
- [x] Diverifikasi nyata (Playwright ad-hoc, bukan cuma baca kode): daftar Lapak baru → mendarat & bertahan di `/daftar/status` setelah reload → Admin approve → login → auto-redirect ke `/dashboard/produk` dari 5 tab lain (`dashboard`, `laporan`, `riwayat`, `qr`, `profil`) + Alert info tampil → tambah Item pertama → modal sukses + tombol "Lihat QR Menu" muncul → sesudahnya semua tab bisa diakses normal → tambah Item kedua → modal **tidak** muncul lagi → Lapak lama yang sudah punya Item (Bakso Pak Budi) login langsung ke `/dashboard` tanpa kena gate sama sekali. Tanpa error console. `tsc --noEmit`/`pnpm lint` (file yang disentuh)/`pnpm build`/`pnpm test` (113) lulus.

## Fase 10 — Rombak Landing Page + Direktori Publik "Semua Gerai" ✅

> User minta landing page dirombak (terasa generik, urutan/copy kurang tajam) memakai skill desain frontend, tapi token warna/tipografi/komponen `ui/` tetap ikut [DESAIN-SISTEM.md](DESAIN-SISTEM.md) — dikonfirmasi via AskUserQuestion. Setelah beberapa putaran preview lokal, User minta banyak revisi kalibrasi (spacing dicoba beberapa nilai sampai pas, ukuran mockup HP naik-turun, judul & kartu "Asisten" ditulis ulang beberapa kali) plus dua fitur baru: (1) halaman publik `/gerai` untuk melihat **semua** Gerai (landing cuma showcase 12 Lapak terbaru), supaya Pembeli bisa pesan-dulu-ambil-nanti tanpa perlu antre, tetap bisa filter per Area; (2) badge status **Buka/Tutup** di tiap kartu Gerai (data dari jadwal operasional yang sudah ada, lihat [DATA-MODEL.md](DATA-MODEL.md)). Di akhir, User minta **semua efek hover & scroll dihapus** supaya halaman lebih ringan — landing sekarang statis sepenuhnya kecuali gumpalan ambient di hero.

**Kode ubah — struktur & naskah**
- [x] `src/app/page.tsx` — badge eyebrow di atas tiap judul seksi dihapus; seksi "Gerai Terdaftar" dipindah lebih awal (sebelum "Fitur"); ikon "Cara Kerja" tetap gaya asli (angka raksasa transparan di pojok kartu, dirapikan supaya tidak lagi bocor keluar batas kartu); jarak antara garis pembatas dan daftar fitur Pedagang/Pembeli dikalibrasi berkali-kali (36px → 48px → 64px → 56px → 52px → 40px → 32px, lihat kode untuk nilai final `mt-*` terkini); judul & isi tiap seksi (hero, Cara Kerja, Fitur, Asisten) ditulis ulang berkali-kali mengikuti arahan User, termasuk kartu "Asisten" yang sempat pakai badge label lalu ikon lampu lalu balik ke nomor urut polos; dua CTA penutup ("Daftarkan Lapak Sendiri" & "Ajak Pedagang Lain") tetap 2 seksi besar terpisah seperti semula; ikon panah "Scroll" & daftar keunggulan checklist di hero dihapus (dianggap redundan dengan navbar); tanda em dash (—) di body copy diganti koma/titik dua.
- [x] `src/components/landing/PhoneMockup.tsx` — final `max-w-[380px]` di desktop, isinya kartu Pesanan Pedagang sungguhan (Kode Pesanan + status "Dibayar" + daftar Item + tombol "Tandai Diproses", persis pola `MerchantOrderCard`) + bottom nav 4 tab persis `DashboardNav` (Pesanan · Item · Riwayat · Laporan) supaya proporsinya lebih memanjang ala layar HP asli — bukan lagi layar menu + status Pesanan bergantian yang tidak ada di aplikasi asli.
- [x] `src/components/landing/SiteHeader.tsx` + `SiteFooter.tsx` baru — header/footer landing diekstrak jadi komponen bersama (dipakai `/` dan `/gerai`), nav tambah link "Semua Gerai"; link seksi (`#cara-kerja` dst.) pakai path absolut (`/#cara-kerja`) supaya benar dibuka dari halaman mana pun.
- [x] `src/app/gerai/page.tsx` baru — halaman publik daftar **semua** Lapak disetujui, reuse `MerchantShowcase` (filter Area ikut terbawa, tidak dihilangkan), `EmptyState` kalau belum ada Lapak.

**Kode ubah — hapus semua efek hover/scroll (2026-09-21, permintaan lanjutan)**
- [x] Dihapus total (file dihapus): `src/components/landing/Reveal.tsx`, `RevealText.tsx` (scroll-reveal), `TiltCard.tsx` (tilt+spotlight ikut kursor saat hover), `Magnetic.tsx` (tombol tertarik ke kursor saat hover), `CursorGlow.tsx` (sorotan ikut kursor se-halaman), `ScrollProgressBar.tsx` (bar progres scroll). Semua pemakaiannya di `src/app/page.tsx`, `src/app/gerai/page.tsx`, `src/components/landing/SiteHeader.tsx`, `SiteFooter.tsx`, `src/components/buyer/MerchantShowcase.tsx` diganti elemen statis / komponen `ui/Card` biasa (tanpa animasi apa pun) — halaman kini render langsung tanpa menunggu `IntersectionObserver`/scroll. `AmbientBlobs.tsx` (gumpalan gradien loop otomatis di hero, bukan dipicu hover/scroll) sengaja **dipertahankan**.
- [x] `PhoneMockup.tsx` sekaligus diubah jadi Server Component statis (tanpa `"use client"`, tanpa `motion/react`) — sebelumnya pakai tilt-on-hover + parallax-on-scroll.

**Kode ubah — status Buka/Tutup di kartu Gerai**
- [x] `src/server/merchants.ts` — `queryApprovedMerchants` (dipakai `listApprovedMerchants` showcase-12 & `listAllApprovedMerchants` direktori, limit aman 500 bukan pagination) sekarang batch-query `merchant_operating_hours` untuk semua Lapak sekaligus (`inArray`, bukan per-Lapak) lalu hitung `isOpen` lewat `evaluateSchedule` + override manual — logika sama seperti `getMerchantOpenState` (`src/lib/schedule/is-merchant-open.ts`) tapi dibatch supaya daftar publik tidak N-query.
- [x] `PublicMerchantListItem` (`src/types/merchant.ts`) tambah field `isOpen: boolean`.
- [x] `src/components/buyer/MerchantShowcase.tsx` — badge `Badge` tone `success`/`neutral` ("Buka"/"Tutup") di pojok kanan-atas foto tiap kartu Gerai (landing & `/gerai`, keduanya reuse komponen ini).
- [x] [DESAIN-SISTEM.md](DESAIN-SISTEM.md) — §4 dikoreksi (grid hero final `lg:grid-cols-2`, bukan rasio custom yang sempat dicoba) + catatan "statis, tanpa efek hover/scroll"; §5 tambah bullet pola kartu Gerai publik (badge status buka/tutup).

**Verifikasi**
- [x] `tsc --noEmit` & `biome check` lulus untuk semua file yang disentuh (termasuk setelah penghapusan 6 file komponen).
- [x] Manual lewat Playwright (dev server sungguhan) di tiap putaran revisi: `/` desktop (1440px) + mobile (390px) dan `/gerai` desktop — nol error console; setelah efek hover/scroll dihapus, screenshot tidak perlu lagi discroll bertahap (konten langsung tampil semua, membuktikan tidak ada lagi ketergantungan `whileInView`). Badge Buka/Tutup diverifikasi tampil benar di kedua halaman.
- [x] `pnpm build` & `pnpm test:e2e` (7) dijalankan ulang sebelum merge ke `main` — semua lulus, termasuk setelah fix bug `/gerai` yang sempat ke-static-generate (lihat bullet status Buka/Tutup di atas).

## Alamat Fisik Lapak + Tombol Buka di Peta (halaman Menu Pembeli) ✅

> User minta halaman menu (`/menu/[stallSlug]`) menampilkan alamat fisik Lapak (supaya Pembeli tidak bingung mencari tempatnya saat ambil pesanan) plus tombol yang membuka peta navigasi ke titik lokasinya. Titik GPS (`merchants.latitude`/`longitude`, Fase 8) sudah ada tapi cuma dipakai buat pengelompokan Area — belum pernah ditampilkan ke Pembeli. Belum ada kolom alamat teks sama sekali, jadi ditambah kolom baru. Plan mode dulu (`~/.claude/plans/polymorphic-spinning-sphinx.md`).
>
> **Update (revisi sebelum commit)**: User minta alamat teks & titik GPS disinkronkan (bukan dua input independen yang bisa divergen) plus desain blok di halaman menu dirapikan jadi satu kartu. Dikonfirmasi AskUserQuestion: alamat **auto-terisi dari reverse-geocode pin** (Nominatim), tetap bisa diedit manual.

**Skema DB (migrasi `0011_classy_echo.sql`)**
- [x] `merchants`: kolom baru `address` (`text`, nullable, tanpa default — baris lama otomatis `NULL`). Independen dari `latitude`/`longitude` (boleh isi salah satu saja, tidak ada refine saling terikat).

**Kode**
- [x] `updateMerchantProfileSchema` (Zod): tambah `address` opsional, max 200 karakter.
- [x] `getMerchantProfile`/`updateMerchantProfile` (`src/server/merchants.ts`) + `MerchantProfileView` (`src/types/merchant.ts`) — sertakan `address`.
- [x] `src/server/geocoding.ts` baru — `reverseGeocodeAddress(lat, lng)`, fetch server-side ke Nominatim (`User-Agent` custom, wajib server karena forbidden header di browser), rate limit `checkRateLimit` (20/menit per sesi Pedagang), timeout 5s, gagal apa pun → `null` (tidak pernah throw).
- [x] `MerchantProfileForm.tsx` — field "Alamat Lapak (opsional)" (`Textarea`) ditaruh **setelah** "Lokasi Lapak (GPS)" (urutan dibalik dari draft awal — alamat sekarang turunan dari pin). `handleLocationChange` baru: tiap pin berubah → panggil `reverseGeocodeAddress` → auto-isi `address` (state `geocoding` mengubah hint field jadi "Mengambil nama alamat dari peta..."). "Hapus lokasi" sengaja **tidak** ikut mengosongkan alamat (bisa berisi editan manual Pedagang). Tetap bisa diedit manual kapan saja.
- [x] `getStallCatalog` (`src/server/products.ts`) + `StallCatalogView.merchant` (`src/types/product.ts`) — tambah `address`, `latitude`, `longitude` (data yang sudah di-query, sebelumnya tidak diekspos ke Pembeli).
- [x] `src/app/(buyer)/menu/[stallSlug]/page.tsx` — satu `Card` (`ui/Card.tsx`), teks alamat (`truncate`, satu baris + ellipsis biar Card tidak melar ke bawah) sebaris dengan tombol "Buka di Peta". Tombol **icon-only** (`<a>` di-style `buttonClasses({size:"md", className:"w-11 px-0"})` — 44×44, variant default `primary` warna sama tombol "Tambah", `MapPinIcon size-6`), `aria-label`/`title="Buka di Peta"` buat aksesibilitas. Bukan `ButtonLink` karena URL eksternal; href Google Maps mode navigasi (`https://www.google.com/maps/dir/?api=1&destination=lat,lng`). **Card cuma dirender kalau `address` terisi** (bukan `address || latitude`) — titik GPS tanpa alamat teks dulu bikin Card tampil isi tombol doang tanpa konteks, keliatan aneh/bug; sekarang tombol peta cuma nongol berdampingan alamat, bukan berdiri sendiri.
- [x] `docs/TEKNOLOGI.md` baris Peta — direvisi: forward-search alamat tetap tidak disediakan, reverse-geocoding (Nominatim) ditambahkan.

**Verifikasi**
- [x] `tsc --noEmit` / `pnpm lint` / `pnpm build` lulus. `pnpm test` (vitest, 113) tetap lulus — `reverseGeocodeAddress` murni I/O boundary (pola sama `midtrans-provider.ts`, tidak diunit-test terpisah).
- [x] Manual nyata (dev server + Playwright ad-hoc): login Pedagang demo (`bakso-pak-budi`) → geser pin di `/dashboard/profil` → field alamat auto-terisi → edit manual → simpan → reload → editan tersimpan (bukan balik ke hasil auto). Buka `/menu/bakso-pak-budi` → satu Card alamat+tombol tampil rapi, href koordinat benar, klik membuka Google Maps ke titik yang tepat. Lapak tanpa alamat/lokasi → Card tidak tampil, nol error console.

## Backlog Ide Masa Depan (belum dijadwalkan, lihat [PRD.md §5](PRD.md#5-di-luar-lingkup-mvp-out-of-scope--dicatat-sebagai-ide-masa-depan-di-backlogmd))

- [ ] Integrasi notifikasi pembayaran otomatis untuk QRIS pribadi via API merchant bank/e-wallet tertentu (mis. GoPay Merchant/DANA Bisnis) — ditolak utk Fase 7 (terlalu fragile/berisiko utk notification-scraping, dan API resmi butuh integrasi per-provider), didiskusikan lagi kalau User sudah putuskan provider mana yang mau didukung.
- [ ] OTP untuk login Pedagang/Admin (hardening keamanan).
- [ ] Model settlement Split/Marketplace (uang langsung ter-split ke Pedagang) — kalau Aplikator naik jadi badan usaha.
- [ ] Refund/pembatalan Pesanan setelah `dibayar` (Midtrans refund API + penyesuaian Saldo/Pencairan).
- [x] ~~Varian Item (ukuran, level pedas, dll).~~ — **selesai 2026-09-16** (grup+opsi varian per Item, harga per opsi opsional, stok tetap di level Item — lihat [DATA-MODEL.md](DATA-MODEL.md#product_variant_groups--product_variant_options-varian-item--2026-09-16)).
- [ ] Multi-Lapak per Pedagang.
- [ ] Notifikasi WhatsApp ke Pedagang saat ada Pesanan baru.
- [x] ~~Laporan analitik penjualan (harian/mingguan) untuk Pedagang~~ — **selesai 2026-09-09** (versi ringan + asisten aturan, lihat seksi "Laporan Penjualan + Asisten Rekomendasi"). Sisa: laporan **Admin** lintas-Lapak, analitik mendalam, ekspor, asisten LLM — masih ide masa depan.
- [ ] PWA "Add to Home Screen" untuk halaman Pembeli.
