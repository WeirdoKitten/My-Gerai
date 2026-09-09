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
- [x] Generate & download/cetak QR Lapak. — `qrcode` (reuse dari Fase 2), unduh via `<a download>` data URI, diverifikasi file PNG sungguhan ter-download & valid.

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
- [x] Tab **"Riwayat"** (ikon `HistoryIcon` baru) di `DashboardNav` → jadi 4 tab: Pesanan · Riwayat · Item · QR Lapak.
- [x] `src/lib/utils/datetime.ts` — `formatDateTime` (`Intl.DateTimeFormat("id-ID")` medium+short), dipatok `timeZone: "Asia/Jakarta"` supaya timestamp yang dirender server (kontainer UTC) tetap tampil jam WIB.
- [x] Diverifikasi: `tsc`/`lint`/`build`/`pnpm test` (57, +2 `tests/unit/datetime.test.ts`) lulus; `pnpm test:e2e` (3) lulus — `order-flow` diperluas: sesudah "Tandai Selesai" → buka tab Riwayat → Pesanan muncul dengan badge "Selesai" + "Bagianmu". Cek visual browser (Playwright, mobile): 2 Pesanan `selesai` + 1 `kedaluwarsa` tampil benar.

## Laporan Penjualan + Asisten Rekomendasi (Pedagang) ✅

> Pedagang belum punya cara melihat performa Lapak. Fitur ini = versi **ringan** dari "Laporan analitik" (dulu Ide Masa Depan). Sisi **Pedagang saja** — laporan Admin & analitik mendalam tetap di luar lingkup. Asisten = **mesin aturan deterministik, bukan LLM** (keputusan User, AskUserQuestion 2026-09-09; [ARSITEKTUR-SISTEM.md](ARSITEKTUR-SISTEM.md) ADR 2026-09-09). **Tanpa perubahan skema** — query agregat read-only atas `orders`/`order_items`.

- [x] `src/server/reports.ts` — `getMerchantSalesReport(period)` (`"use server"`, identitas Lapak dari sesi). Query agregat (`sql`/`groupBy`/`mapWith(Number)` ala `payouts.ts`) paralel: ringkasan periode + periode sebelumnya (delta %), penjualan per hari, Item terlaris, dan agregat khusus asisten (per-Item 7h/30h + laku terakhir, per jam, per hari-dalam-minggu, pasangan co-occurrence). Filter penjualan = `PAID_ORDER_STATUSES` (diekstrak ke `order-status.ts`, dipakai bareng `payouts.ts`). Semua bucket waktu dipatok `Asia/Jakarta`.
- [x] `src/lib/report/insights.ts` — mesin aturan (fungsi pure, tanpa DB). 7 rule ber-ambang: `restock`, `item_mati`, `jam_ramai`, `hari_sepi`, `fokus_menu` (Pareto 80%), `sering_bareng`, `harga`. Gerbang data global: `< 20` Pesanan dibayar / riwayat `< 7` hari → `[]` (UI tampilkan pesan "kumpulkan data dulu"). `src/lib/report/period.ts` — resolusi periode + kunci tanggal WIB (pure, teruji).
- [x] Halaman `/dashboard/laporan` + `SalesReportView` (Server Component). Segmented control periode (`?periode=hari_ini|7_hari|30_hari`, default 7). Kartu "Rekomendasi Asisten" (maks 4, urut prioritas) di atas; grid 4 angka + delta; bar penjualan per hari (CSS, bukan library — konsul skill `dataviz`); tabel Item terlaris + bar % kontribusi.
- [x] Tab **"Laporan"** (ikon `ChartIcon`; kartu asisten pakai `LightbulbIcon`) di `DashboardNav`. Letak dikonfirmasi User (AskUserQuestion 2026-09-09).
- [x] **Bottom nav dirapikan** (permintaan User lanjutan): **QR Lapak** dipindah dari tab ke **ikon header** (di samping ikon Profil) — QR = cetak sekali, tak perlu slot tab. Bottom nav jadi **4 tab** urut **Pesanan · Item · Riwayat · Laporan**.
- [x] `src/lib/db/seed-orders.ts` + `pnpm db:seed:orders` (dev, guard localhost, idempoten via penanda `buyerNote`) — ±150 Pesanan historis 30 hari dengan pola sengaja (Bakso Urat terlaris, Pangsit "mati", puncak makan siang, Rabu sepi, kombo Bakso Urat + Es Teh).
- [x] Diverifikasi: `tsc`/`lint`/`build`/`pnpm test` (85, +28: `report-insights` + `report-period`) lulus; `pnpm test:e2e` (3) lulus — `order-flow` diperluas cek tab Laporan (Omzet + pesan asisten-menunggu-data). Cek visual browser (Playwright, mobile) dengan `db:seed:orders`: ke-3 periode benar, delta ▲/▼ warna benar, 4 kartu asisten sesuai pola seed (restock Mie Ayam, jam 12–13 42%, Rabu sepi, kombo Bakso Urat+Es Teh).

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

## Backlog Ide Masa Depan (belum dijadwalkan, lihat [PRD.md §5](PRD.md#5-di-luar-lingkup-mvp-out-of-scope--dicatat-sebagai-ide-masa-depan-di-backlogmd))

- [ ] OTP untuk login Pedagang/Admin (hardening keamanan).
- [ ] Model settlement Split/Marketplace (uang langsung ter-split ke Pedagang) — kalau Aplikator naik jadi badan usaha.
- [ ] Refund/pembatalan Pesanan setelah `dibayar` (Midtrans refund API + penyesuaian Saldo/Pencairan).
- [ ] Varian Item (ukuran, level pedas, dll).
- [ ] Multi-Lapak per Pedagang.
- [ ] Notifikasi WhatsApp ke Pedagang saat ada Pesanan baru.
- [x] ~~Laporan analitik penjualan (harian/mingguan) untuk Pedagang~~ — **selesai 2026-09-09** (versi ringan + asisten aturan, lihat seksi "Laporan Penjualan + Asisten Rekomendasi"). Sisa: laporan **Admin** lintas-Lapak, analitik mendalam, ekspor, asisten LLM — masih ide masa depan.
- [ ] PWA "Add to Home Screen" untuk halaman Pembeli.
- [ ] Pengelompokan Lapak per lokasi/pasar fisik.
