# Changelog Ground Truth & Fitur

> Riwayat perubahan pada dokumen ground truth (`docs/*`, `CLAUDE.md`) dan fitur besar aplikasi. Format entri: lihat [docs/DOKUMENTASI.md](docs/DOKUMENTASI.md#format-entri-changelogmd). Entri terbaru di paling atas.

## 2026-09-08 — Ground truth Fase 6: payment nyata Midtrans + Pencairan otomatis ("Model B")

**Dampak:** [docs/ARSITEKTUR-SISTEM.md](docs/ARSITEKTUR-SISTEM.md) (4 ADR baru + §Alur Data Pencairan Otomatis), [docs/TEKNOLOGI.md](docs/TEKNOLOGI.md) (Midtrans+Iris menggantikan Tripay, abstraksi + env + setup sandbox), [docs/DATA-MODEL.md](docs/DATA-MODEL.md) (kolom `orders.payout_id`, `merchants.payout_*`, `payments`, `payouts` restruktur, `platform_config.qris_mdr_bps`, formula Saldo, gerbang Route Handler non-sesi), [docs/PRD.md](docs/PRD.md) (§4/§5/§6.3/§7/§8), [docs/GLOSSARY.md](docs/GLOSSARY.md), [docs/BACKLOG.md](docs/BACKLOG.md) (Fase 6 ditulis ulang), [docs/ARSITEKTUR-FOLDER.md](docs/ARSITEKTUR-FOLDER.md), [CLAUDE.md](CLAUDE.md), `.env.example`
**Alasan:** User memutuskan menghapus Pencairan manual Admin → uang sampai ke Pedagang otomatis. Setelah membandingkan 3 model (Agregator+manual / Agregator+auto-disburse / Split-Marketplace), dipilih **Model B** (Agregator + Pencairan otomatis via disbursement API). Gateway diganti dari Tripay ke **Midtrans** karena punya **Iris** (disbursement) satu ekosistem + sandbox lengkap. Keputusan uang dikonfirmasi User via AskUserQuestion. Branch: `feat/payment-midtrans-model-b`. **Belum ada kode** — ground truth dulu, implementasi menyusul setelah User setuju.
**Ringkasan:**
- **Settlement tetap Agregator**, tapi Pencairan **otomatis**: dana Pembeli masuk 1 akun Midtrans Aplikator → job harian (`POST /api/cron/disburse`, guard `CRON_SECRET`, dipicu Scheduled Job Dokploy) memanggil **Midtrans Iris** untuk transfer Saldo tiap Lapak. Pencairan manual & `recordPayout` **dihapus**; `/admin/payouts` jadi read-only.
- **Payment nyata** via `MidtransPaymentProvider` (Core API `payment_type: qris`), dipilih env `PAYMENT_PROVIDER` (`mock` default). Webhook `POST /api/webhooks/payment` **wajib** verifikasi `signature_key` SHA512. `MockPaymentProvider` + tombol simulasi tetap untuk dev/test. Abstraksi baru `DisbursementProvider` (mock/iris).
- **Uang (keputusan User)**: **MDR QRIS ditanggung Aplikator, TIDAK boleh dibebankan ke Pembeli** (PBI 23/6/PBI/2021 Ps. 52 — Pembeli bayar persis harga Item, nol perubahan kalkulasi Pesanan). **Biaya transfer Iris ditanggung Pedagang** (dipotong tiap Pencairan → `net_amount`). Pencairan **harian, tanpa ambang**. Uang cair ke rekening Pedagang **H+1 hari kerja** (sifat siklus settlement QRIS).
- **Skema**: `orders.payout_id` (link ke Pencairan; Saldo = `SUM(total_for_merchant) WHERE payout_id IS NULL`); `merchants` info rekening jadi terstruktur + tervalidasi Iris; `payments` (+`midtrans`, `gross_amount`, `qr_string`); `payouts` (batch harian, `UNIQUE(merchant_id, period_date)`, status `pending|processing|completed|failed`, `beneficiary_*` snapshot).
- **Ditunda**: refund/pembatalan setelah `dibayar`, Split/Marketplace (butuh badan usaha), instant settlement.
- **PR User sebelum go-live**: verifikasi ke Midtrans bahwa akun perorangan bisa aktivasi Core API QRIS + Iris.

## 2026-09-08 — Kredensial akun uji seed dibuat berpola & mudah diingat

**Dampak:** kode (`src/lib/db/seed.ts`, `src/lib/db/seed-demo.ts`, `tests/e2e/order-flow.spec.ts`)
**Alasan:** User: nomor & password akun dummy Pedagang/Admin terlalu rumit — minta pola sederhana (mis. `082222222222` / `password`).
**Ringkasan:**
- Password semua akun seed: `Password123!` → **`password`** (8 karakter, tetap lolos aturan registrasi `min(8)`). `seed-demo.ts` masih hormati env `SEED_DEMO_PASSWORD` bila server demo publik ingin password lebih kuat.
- Nomor HP jadi berpola "digit diulang" (tetap lolos regex registrasi `^08\d{8,11}$`):
  - Admin: `081299999999` → `081111111111`
  - Pedagang approved (Bakso Pak Budi): `081200000001` → `082222222222`
  - Pending #1 / uji APPROVE (Batagor Bu Siti): `081200000002` → `083333333333`
  - Approved #2 / uji isolasi (Warung Cak Slamet): `081200000003` → `084444444444`
  - Pending #2 / uji REJECT (Cakue Mang Udin): `081200000004` → `085555555555`
- Diverifikasi: `pnpm lint` + `pnpm test` (31) lulus; `pnpm db:seed` jalan; `pnpm test:e2e order-flow` (2) lulus — login Pedagang dengan kredensial baru tembus sampai dashboard.

## 2026-09-08 — Tambah ke Keranjang: notifikasi toast (bukan ubah label tombol)

**Dampak:** [docs/DESAIN-SISTEM.md](docs/DESAIN-SISTEM.md) (§3 komponen `Toast`), kode (`src/components/ui/Toast.tsx` baru, `src/app/globals.css` keyframes, `src/app/(buyer)/layout.tsx`, `src/components/buyer/AddToCartControls.tsx`)
**Alasan:** User: tombol "Tambah" jangan berubah jadi "Ditambahkan" saat diklik — notifikasi lewat cara lain yang lebih menarik & nyaman.
**Ringkasan:**
- `ToastProvider` + `useToast()` (`ui/Toast.tsx`): pil `bg-ink` di `top-4` tengah, `pointer-events-none`, slide-in + fade-out (`@keyframes toast-in`/`toast-out`, `motion-safe:`), auto-hilang ~2,1 dtk. Satu toast aktif; toast baru menimpa yang lama.
- `AddToCartControls`: hapus state `justAdded` — tombol tetap "Tambah". Setelah `addItem` → `showToast("<nama Item> ditambahkan"` / "N <nama> ditambahkan" kalau qty > 1). `FloatingCartBar` (total keranjang) tetap jadi umpan balik kedua.
- Diverifikasi: `tsc`/`lint`/`build`/`pnpm test` (31) lulus; discreenshot (toast muncul, tombol tidak berubah).

## 2026-09-08 — Navigasi dashboard jadi bottom nav (ikon + label, ala aplikasi HP)

**Dampak:** [docs/DESAIN-SISTEM.md](docs/DESAIN-SISTEM.md) (§4), kode (`src/components/DashboardNav.tsx` + `DashboardShell.tsx`, layout Pedagang/Admin, `src/components/ui/icons.tsx`)
**Alasan:** User minta navigasi seperti aplikasi HP — bar di bawah layar dengan ikon + nama tiap menu.
**Ringkasan:**
- `DashboardNav` dirombak dari tab atas jadi **bottom nav** `fixed inset-x-0 bottom-0` — tiap tab = ikon (`size-5`) + label (`text-[11px]`), lebar `max-w-md` di tengah, aktif `text-brand-strong`. `<main>` dapat `pb-24`. Top bar tinggal brand + Profil + Keluar.
- `NavItem.icon` sekarang **string** (`"receipt"|"tag"|"qr"|"store"|"settings"|"wallet"`) yang di-resolve `DashboardNav` ke komponen — perlu, karena melempar komponen (fungsi) dari layout (Server Component) ke `DashboardNav` (Client) error serialisasi RSC.
- Ikon baru: `TagIcon`, `SettingsIcon`, `WalletIcon`.
- Diverifikasi: `tsc`/`lint`/`build`/`pnpm test` (31) lulus; discreenshot Pedagang (mobile) + Admin (desktop).

## 2026-09-08 — Revert layout responsif + header dashboard = nama Lapak + Profil jadi ikon

**Dampak:** [docs/DESAIN-SISTEM.md](docs/DESAIN-SISTEM.md) (§4), kode (semua file yang disentuh commit "layout responsif" + `DashboardShell.tsx`, layout Pedagang/Admin, `Wordmark.tsx`, `icons.tsx`)
**Alasan:** User: "tidak usah dibuat responsif, hasilnya jelek — revert semua yang berhubungan dengan responsif." Plus: header dashboard tampilkan **nama Lapak** (bukan "MyGerai"), tombol **Profil jadi ikon saja**.
**Ringkasan:**
- **Revert responsif** (commit `91d82ab`): grid `sm:/lg:grid-cols-2`, shell `max-w-5xl/6xl`, landing `md:grid-cols-2`, wrapper `max-w-lg/md` di alur linier — semua kembali ke **satu kolom** (`max-w-md` Pembeli, `max-w-2xl` Pedagang, `max-w-3xl` Admin), tanpa breakpoint layout. **Dipertahankan** dari commit itu: tombol Keluar `dangerOutline`, teks landing "Daftar"/"Masuk" (tanpa panah, tanpa link Admin), scrollbar nav disembunyikan. Perubahan setelahnya (Modal, Stok, Profil) utuh.
- **Header `DashboardShell`**: prop `brand` (ReactNode). Pedagang = `<Wordmark label={stallName}>` (nama Lapak + ikon toko) menggantikan "MyGerai". Admin = `<Wordmark>` "MyGerai" + baris `Admin · <nama>`.
- **Tombol Profil** Pedagang → ikon `UserIcon` (`<Link aria-label>` kotak `size-9 border`), bukan teks.
- `Wordmark` dapat prop `label` (default "MyGerai"). `DESAIN-SISTEM.md §4` ditulis ulang: mobile-first satu kolom, catat percobaan responsif di-revert.
- Diverifikasi: `tsc`/`lint`/`build`/`pnpm test` (31) lulus; nol kelas `sm:/lg:/md:grid-cols`/`max-w-5xl`/`max-w-6xl` tersisa; discreenshot desktop + mobile.

## 2026-09-08 — Profil Pedagang + header dashboard tanpa nama Lapak

**Dampak:** [docs/ARSITEKTUR-FOLDER.md](docs/ARSITEKTUR-FOLDER.md), [docs/DESAIN-SISTEM.md](docs/DESAIN-SISTEM.md), [docs/BACKLOG.md](docs/BACKLOG.md), kode (`src/components/DashboardShell.tsx` + `DashboardNav.tsx`, `src/app/(merchant)/dashboard/layout.tsx` + `profil/page.tsx` baru, `src/components/merchant/MerchantProfileForm.tsx` baru, `src/server/merchants.ts`, `src/lib/validation/merchant.schema.ts`, `src/types/merchant.ts`)
**Alasan:** Feedback User: nama Lapak di header dashboard ("Warung Pak Budi ...") sebaiknya dihapus, diganti tombol "Profil" untuk mengubah nama dsb. Field yang bisa diubah dikonfirmasi via AskUserQuestion.
**Ringkasan:**
- **Header `DashboardShell`**: `heading` jadi opsional + slot `headerAction`. Pedagang tidak lagi menampilkan nama Lapak — hanya wordmark + tombol **Profil** + **Keluar** + nav. Admin tetap menampilkan `Admin · <nama>`.
- **`/dashboard/profil`**: `getMerchantProfile` / `updateMerchantProfile` (auth Pedagang, Zod) — Pedagang mengubah **Nama Lapak, Nama Pemilik, Kategori, Info Rekening/E-wallet Pencairan** sendiri. Nomor HP tampil read-only (mengubahnya = urusan auth, ditunda); `slug`/QR tidak ikut berubah supaya QR cetak tetap valid.
- **`DashboardNav`**: tab "index" (`/dashboard`, punya tab anak) hanya aktif saat `pathname` cocok **persis** — supaya `/dashboard/profil` tidak menyorot tab "Pesanan".
- Diverifikasi: `tsc`/`lint`/`build`/`pnpm test` (31) lulus; edit profil dites nyata (tersimpan ke DB, nomor HP read-only, nav tidak salah sorot).

## 2026-09-08 — Stok Item (opsional) + Modal Tambah/Ubah Item + perbaikan E2E

**Dampak:** [docs/DATA-MODEL.md](docs/DATA-MODEL.md), [docs/PRD.md](docs/PRD.md), [docs/ARSITEKTUR-SISTEM.md](docs/ARSITEKTUR-SISTEM.md) (ADR), [docs/CODING-STYLE.md](docs/CODING-STYLE.md), [docs/BACKLOG.md](docs/BACKLOG.md), [docs/DESAIN-SISTEM.md](docs/DESAIN-SISTEM.md), kode (`drizzle/0003_*.sql`, `src/lib/db/schema.ts` + `seed*.ts`, `src/server/{products,orders}.ts`, `src/lib/validation/product.schema.ts`, `src/types/product.ts`, `src/components/merchant/Product*.tsx`, `src/components/ui/Modal.tsx` baru, `tests/e2e/*`)
**Alasan:** Feedback User berturut-turut: (1) belum ada stok per Item; (2) form Tambah/Ubah Item sebaiknya pop-up, bukan inline. Keputusan stok via AskUserQuestion: **opsional** (`null` = tak terbatas), **berkurang saat lunas**.
**Ringkasan:**
- **Stok** (`products.stock`, nullable — migrasi `0003`): kalau diisi angka, `createOrder` menolak `qty > stock`, `getStallCatalog` menyembunyikan Item stok 0, dan `simulatePaymentSuccess` mengurangi `GREATEST(stock-qty,0)` **di dalam transaksi** transisi `menunggu_pembayaran → dibayar` (guard `WHERE status='menunggu_pembayaran'` mencegah pengurangan ganda). Lihat ADR 2026-09-08. `ProductForm` dapat field "Stok" (kosong = tak dibatasi); `ProductListItem` menampilkan "· Stok N" (merah bila 0).
- **`Modal`** (`src/components/ui/Modal.tsx`): dialog `<dialog>` bawaan. Form Tambah/Ubah Item sekarang pop-up, bukan `<Card as="form">` inline. `ProductManager`/`ProductListItem` jadi lebih sederhana.
- **E2E diperbaiki**: `order-flow.spec.ts` & `rate-limit.spec.ts` masih pakai selector CSS lama (`div.rounded-lg.border`, `"Tambah ke Keranjang"`, `p.text-red-600`) dari sebelum Fase Tampilan — diganti ke selector berbasis role/teks (`getByRole("button", {name:"Tambah"})`, `getByText(orderCode)`, `form >> role=alert`). 3/3 lulus.
- Diverifikasi: `tsc`/`lint`/`build`/`pnpm test` (31)/`pnpm test:e2e` (3) lulus; alur stok dites nyata (pesan+bayar → stok turun, over-order ditolak, Item tak-terbatas tak terpengaruh).

## 2026-09-08 — Fitur upload foto Item (dari HP Pedagang)

**Dampak:** [docs/ARSITEKTUR-SISTEM.md](docs/ARSITEKTUR-SISTEM.md) (ADR baru), [docs/TEKNOLOGI.md](docs/TEKNOLOGI.md) ("Storage foto" diputuskan), [docs/DATA-MODEL.md](docs/DATA-MODEL.md), [docs/ARSITEKTUR-FOLDER.md](docs/ARSITEKTUR-FOLDER.md), [docs/BACKLOG.md](docs/BACKLOG.md), kode (`src/server/products.ts`, `src/lib/validation/product.schema.ts`, `src/components/merchant/ProductForm.tsx`, `src/lib/upload/*` baru, `src/app/uploads/[...path]/route.ts` baru, `src/types/product.ts`, `Dockerfile`, `docker-entrypoint.sh`, `.dockerignore`, `.gitignore`, `tests/unit/upload.test.ts` baru)
**Alasan:** Lanjutan feedback User — Pedagang harus bisa menaruh foto Item sendiri. Plan mode dulu (fitur besar + keamanan, RULES §5.2), rencana disetujui (`~/.claude/plans/wild-rolling-turtle.md`). Keputusan penyimpanan (AskUserQuestion): **volume Docker persisten** di Garuda, bukan Cloudflare R2.
**Ringkasan:**
- **Penyimpanan**: file ditulis ke `UPLOADS_DIR` (`/app/uploads` di produksi = named volume Docker; `.uploads/` di dev). Disajikan lewat Route Handler `src/app/uploads/[...path]/route.ts` (bukan `public/` yang dibaked saat build) — path di-sanitasi (`path.resolve` + cek `startsWith(UPLOADS_DIR)`), hanya ekstensi gambar, `Cache-Control: immutable` + `X-Content-Type-Options: nosniff`.
- **Konsekuensi arsitektur**: container aplikasi **tidak lagi 100% stateless** — perlu volume dimount di Dokploy. Backup foto = backup volume (manual). ADR baru di ARSITEKTUR-SISTEM.md.
- **Upload** (`uploadProductPhoto` Server Action): auth Pedagang, rate-limit 30/10menit per-merchant, batas 3 MB, validasi tipe lewat **magic-bytes** (JPG/PNG/WebP — **SVG ditolak**, bisa memuat script), nama file `crypto.randomUUID()` (ekstensi dari magic-bytes, bukan dari klien). Foto di-**resize di klien** dulu (`src/lib/upload/resize-image.ts`, maks 1280px, JPEG — tanpa dependency `sharp`).
- **Skema**: `product.schema.ts` `photoUrl` di-regex kunci ke `^/uploads/products/<uuid>\.(jpg|png|webp)$` (tidak bisa simpan URL sembarang / `javascript:` / traversal). `updateProduct` kini **ikut menulis** `photo_url` → `ProductForm` selalu mengirim balik nilai saat ini (prefill dari `product.photoUrl`).
- **UI**: `ProductForm` dapat pemilih foto (`<input type=file accept=image/*>`), pratinjau, tombol Ganti/Hapus Foto.
- **Orphan file** (foto lama saat diganti/dihapus) dibiarkan di volume — sesuai filosofi lazy-cleanup proyek. Dicatat sebagai keterbatasan diketahui.
- **`/security-review`**: tidak ada temuan HIGH/MEDIUM. 1 hardening kecil diterapkan (`nosniff`). Unit test baru `tests/unit/upload.test.ts` (7 test: magic-bytes JPG/PNG/WebP + tolak teks/SVG; regex path terima yang sah + tolak URL eksternal/traversal/ekstensi lain).
- **Diverifikasi nyata**: dev (upload via Playwright → file di `.uploads/products/`, muncul di menu Pembeli & Kelola Item, edit nama Item tidak menghilangkan foto, "Hapus Foto" jalan) + `docker build`+`run` dengan named volume (tulis sebagai user `nextjs`, sajikan via route, `/uploads/%2e%2e%2fserver.js`→404, foto persist setelah `docker restart`). `tsc`/`lint`/`build`/`pnpm test` (31) lulus.
- **TODO User sebelum deploy versi ini**: tambahkan Volume Mount `/app/uploads` di Dokploy (`mygerai-app` → Advanced → Volumes), kalau tidak foto hilang tiap redeploy.

## 2026-09-07 — Foto Item: tampilan (read-only) + foto demo di seeder

**Dampak:** [docs/ARSITEKTUR-FOLDER.md](docs/ARSITEKTUR-FOLDER.md), kode (`src/lib/db/{seed,seed-demo}.ts`, `src/types/product.ts`, `src/server/products.ts`, `src/components/merchant/ProductListItem.tsx`, `public/img/menu/*.jpg` baru)
**Alasan:** Feedback User — menu Pembeli terlihat kosong tanpa foto Item. Keputusan via AskUserQuestion: fitur **upload foto dari HP** dimau (task tersendiri, menunggu keputusan penyimpanan — lihat BACKLOG); untuk sekarang **foto demo lokal di seeder** + tampilkan foto yang sudah ada (read-only).
**Ringkasan:**
- 5 foto makanan (Unsplash, ~264 KB total) di `public/img/menu/` — disajikan lewat `next/image` (lokal, tanpa `remotePatterns`).
- `seed.ts` & `seed-demo.ts` mengisi `products.photo_url` untuk sebagian Item demo (`Bakso Halus` sengaja tanpa foto → uji tampilan placeholder).
- `MerchantProductView` + `listMerchantProducts` kini bawa `photoUrl`; `ProductListItem` menampilkan thumbnail 48px (placeholder ikon kalau kosong). `ProductCard` Pembeli sudah render `photoUrl` sejak Fase Tampilan.
- **Belum ada** cara Pedagang menambah/ubah foto (`createProduct`/`updateProduct` tidak menyentuh `photo_url` — foto seed aman saat Item diedit). Fitur upload menyusul.

## 2026-09-07 — Tampilan: QR Lapak jadi tab sendiri + rapikan header dashboard

**Dampak:** [docs/DESAIN-SISTEM.md](docs/DESAIN-SISTEM.md), [docs/ARSITEKTUR-FOLDER.md](docs/ARSITEKTUR-FOLDER.md), kode (`src/components/DashboardShell.tsx`, `src/app/(merchant)/dashboard/{layout,page}.tsx`, `src/app/(merchant)/dashboard/qr/page.tsx` baru, `src/components/merchant/QrLapakCard.tsx`)
**Alasan:** Feedback User setelah melihat Fase Tampilan — (1) QR Lapak jangan menyatu dengan halaman Pesanan, kasih navigasi sendiri; (2) di header dashboard tulisan "MyGerai" dan nama Lapak tumpang tindih terlalu berdekatan; (3) tombol "Keluar" jangan cuma teks, kasih kotak.
**Ringkasan:**
- **QR Lapak pindah** dari `/dashboard` ke tab baru `/dashboard/qr`. `/dashboard` sekarang murni daftar Pesanan. Nav Pedagang jadi 3 tab: Pesanan · Item · QR Lapak.
- **Header `DashboardShell` dirombak** jadi 3 baris jelas (wordmark + Keluar / nama Lapak `text-base font-bold` / nav) — tidak lagi wordmark & nama menempel tanpa jarak.
- **Tombol Keluar** kini `Button variant="danger" size="sm"` (kotak merah), bukan teks polos.
- Diverifikasi: `tsc`/`lint`/`build`/`pnpm test` lulus; discreenshot ulang (desktop + mobile) — header lega, tab QR berfungsi.

## 2026-09-07 — Fase Tampilan: desain sistem & percantik seluruh UI

**Dampak:** [docs/DESAIN-SISTEM.md](docs/DESAIN-SISTEM.md) (baru), [CLAUDE.md](CLAUDE.md), [docs/DOKUMENTASI.md](docs/DOKUMENTASI.md), [docs/ARSITEKTUR-FOLDER.md](docs/ARSITEKTUR-FOLDER.md), [docs/TEKNOLOGI.md](docs/TEKNOLOGI.md), [docs/BACKLOG.md](docs/BACKLOG.md), kode (`src/app/globals.css`, `src/app/layout.tsx`, seluruh `src/app/**/page.tsx` & `layout.tsx`, seluruh `src/components/**`, `src/components/ui/**` baru, `src/lib/utils/cn.ts` baru)
**Alasan:** Tampilan sebelumnya masih template default Next.js (hitam-putih polos, `body` malah ke Arial, dark mode ikut sistem, komponen cuma `border-zinc + rounded-lg`, string kelas panjang disalin di banyak tempat). User minta fase khusus mempercantik UI — rapi, hangat, nyaman, sederhana, konsisten. Arah dikonfirmasi User via AskUserQuestion: **hangat/menggugah selera** (aksen oranye), **terang saja** (tanpa dark mode), font **Plus Jakarta Sans**, ground truth ditulis dulu sebelum ngoding.
**Ringkasan:**
- **Ground truth baru [docs/DESAIN-SISTEM.md](docs/DESAIN-SISTEM.md)**: token warna (`--color-bg` warm paper `#FAF6F1`, `--color-ink` `#1C1917`, `--color-brand` oranye `#EA580C` / `--color-brand-strong` `#C2410C` untuk tombol dengan kontras AA, plus success/warning/danger/info), tipografi (Plus Jakarta Sans, base 15px, `tabular-nums` untuk angka), radius (kartu 16px, kontrol 12px), shadow lembut hangat, resep kelas kanonik tiap komponen, aturan layout per-permukaan, daftar "yang dihindari" (`dark:`, `zinc-*`, `#000`, salin string kelas).
- **`globals.css`** dirombak ke Tailwind v4 `@theme` (token di atas). `layout.tsx` ganti Geist → Plus Jakarta Sans via `next/font`. `body` base (bg/warna/font/ukuran) + `prefers-reduced-motion`.
- **`src/components/ui/`** (baru, buatan sendiri — bukan shadcn/Radix): `Button`, `ButtonLink`, `Input`, `Textarea`, `Field`, `Card`, `Badge`, `OrderStatusBadge`, `Alert`, `QuantityStepper`, `PageHeader`, `EmptyState`, `Spinner`, `Wordmark`, `icons` (inline SVG, tanpa library ikon). Kerangka bersama `AuthShell` (halaman login/daftar), `DashboardShell` + `DashboardNav` (header sticky + nav tab Pedagang & Admin). Helper `lib/utils/cn.ts`.
- **Semua halaman & komponen dirakit ulang** dari primitif di atas — Pembeli (landing `/` jadi landing sederhana, `menu`, `checkout`, `pesanan`, `not-found`), Pedagang (dashboard + QR, kelola Item, login, daftar), Admin (approval Pedagang, konfigurasi, saldo & pencairan, login). Nol sisa `dark:` / `zinc-*` / `#000`.
- **Tidak ada perubahan logika bisnis / data / uang** — murni presentasi. Angka yang ditampilkan & label sama persis (mis. "Total Dibayar" tetap `order.subtotal`, catatan Biaya Layanan di checkout tetap teks lama).
- **Diverifikasi nyata**: `tsc --noEmit` / `pnpm lint` / `pnpm build` / `pnpm test` (24) lulus; aplikasi dijalankan (`pnpm dev` + Playwright) dan tiap permukaan discreenshot di viewport desktop (1280) & mobile (390). 2 bug ditemukan lewat screenshot & diperbaiki: (1) nav tab "Pesanan" + "Item" dua-duanya aktif di `/dashboard/produk` (logika prefix → diganti "prefix cocok terpanjang"), (2) input catatan di kartu Item terlalu sempit di mobile (dipindah ke baris sendiri).
- **`/simplify`**: `<Card>` (yang tadinya tidak terpakai) kini dipakai di **semua** ±17 tempat yang sebelumnya menyalin string `rounded-card border border-line bg-surface p-*` — termasuk kartu berbentuk `<form>` (`Card as="form"`). Ubah tampilan kartu sekarang cukup 1 file.

## 2026-09-07 — Migrasi database & seed demo otomatis di image produksi

**Dampak:** [docs/ARSITEKTUR-SISTEM.md](docs/ARSITEKTUR-SISTEM.md) (ADR baru), [docs/ARSITEKTUR-FOLDER.md](docs/ARSITEKTUR-FOLDER.md), [docs/TEKNOLOGI.md](docs/TEKNOLOGI.md) (esbuild + alur migrasi produksi), [docs/BACKLOG.md](docs/BACKLOG.md), kode (`Dockerfile`, `.dockerignore`, `.gitattributes`, `docker-entrypoint.sh`, `src/lib/db/{migrate,seed-demo,create-admin}.ts`, `package.json`, `.env.example`)
**Alasan:** Permintaan User: migrasi & seeder demo dibuatkan file supaya deploy di Dokploy tidak perlu langkah manual (buka port DB eksternal + `pnpm db:migrate` dari laptop). Keputusan lewat AskUserQuestion: akun Admin **tetap dibuat manual** (tidak otomatis dari env), seed demo jalan **otomatis hanya bila `SEED_DEMO=true`**.
**Ringkasan:**
- **`docker-entrypoint.sh`** (ENTRYPOINT image): tiap container start → (1) jalankan migrasi database (selalu, idempoten), (2) kalau `SEED_DEMO=true` isi data demo, (3) `exec` server Next.js. Migrasi otomatis aman karena deployment single-instance (lihat ADR & [TEKNOLOGI.md §Autentikasi](docs/TEKNOLOGI.md#autentikasi) soal asumsi single-instance).
- **`src/lib/db/migrate.ts`**: pakai migrator bawaan `drizzle-orm/postgres-js` (bukan `drizzle-kit`, yang devDependency & tidak ada di image runner minimal). Di stage `builder`, esbuild mem-*bundle* skrip ini + `seed-demo.ts` + `create-admin.ts` jadi file `.mjs` mandiri (`drizzle-orm` + `postgres` di-inline, ±260–300 KB/file) — image runner tidak perlu `node_modules` tambahan.
- **`src/lib/db/seed-demo.ts`**: versi **aman** dari `seed.ts` untuk server — **tanpa `TRUNCATE`**, idempoten (skip kalau Lapak demo `bakso-pak-budi` sudah ada, semua insert pakai `onConflictDoNothing`). `seed.ts` lama tetap dipakai apa adanya untuk dev lokal & E2E (TRUNCATE + guard localhost).
- **`src/lib/db/create-admin.ts`** (`pnpm admin:create`): pembuatan akun Admin manual, idempoten pada nomor HP. Di server dijalankan lewat Terminal container Dokploy (`node scripts/create-admin.mjs "Nama" "0812..." "pass"`) — tidak perlu buka port DB.
- **Bugfix `.dockerignore`**: baris `drizzle` dihapus — folder migrasi sebelumnya tidak ikut masuk build context sama sekali. `.gitattributes` baru memaksa `*.sh` = LF (core.autocrlf Windows bisa merusak entrypoint).
- **Diverifikasi nyata**: `docker build` + `docker run` konek ke Postgres lokal — log entrypoint menunjukkan migrasi → seed → server; `GET /` dan `GET /menu/bakso-pak-budi` = 200 dengan data demo tampil; restart container → migrasi idempoten, seed dilewati. `tsc --noEmit` / `pnpm lint` / `pnpm build` / `pnpm test` (24) lulus.

## 2026-09-06 — Fase 5 selesai: Pengujian & Pengerasan (unit test, E2E, rate-limiting, security review, audit performa)

**Dampak:** [docs/TEKNOLOGI.md](docs/TEKNOLOGI.md) (§Autentikasi: rate-limiting final), [docs/BEST-PRACTICES.md](docs/BEST-PRACTICES.md) (§Testing & §Keamanan ditandai terpenuhi), [docs/ARSITEKTUR-FOLDER.md](docs/ARSITEKTUR-FOLDER.md), [docs/BACKLOG.md](docs/BACKLOG.md), kode (`tests/`, `src/lib/rate-limit/`, `src/lib/utils/order-calc.ts`, `src/server/{orders,merchants,admins}.ts`, `vitest.config.mts`, `playwright.config.ts`, `.env.test.example`, `package.json`)
**Alasan:** Melanjutkan sesuai instruksi User setelah Fase 4 ("lanjut dulu ke fase 5"). Menutup 4 item backlog Fase 5 asli plus gap rate-limiting yang eksplisit "ditunda ke Fase 5" sejak CHANGELOG Fase 2-4. Plan mode dulu (testing infra dari nol + auth + refactor uang) sesuai RULES §5.2; dua keputusan menyangkut uang/UX (angka batas rate-limit, penanganan `totalForMerchant` negatif) dikonfirmasi User dulu via AskUserQuestion sebelum implementasi (RULES §2).
**Ringkasan:**
- **Unit test (Vitest)**: kalkulasi Pesanan diekstrak dari `createOrder` ke fungsi pure `calculateOrderTotals` (`src/lib/utils/order-calc.ts`) — `totalForMerchant` di-clamp minimal 0 (keputusan User: Item gratis + Biaya Layanan tidak pernah membuat bagian Pedagang negatif, Aplikator menanggung selisihnya). 24 test di `tests/unit/{order-calc,order-status,money}.test.ts` mencakup kalkulasi normal, edge case fee nol/Item gratis, dan boundary `isOrderExpired` (`now === expiresAt` harus `false`, kode pakai `>` bukan `>=`). **Dibuktikan menangkap bug nyata**: kode disabotase sebentar (`subtotal - fee` → `subtotal + fee`; `>` → `>=`), 6 test relevan gagal seperti diharapkan, lalu direvert.
- **E2E test (Playwright)**: `tests/e2e/order-flow.spec.ts` menjalankan alur checkout penuh (Pembeli: katalog → keranjang → checkout → bayar) lalu alur Pedagang (login → maju status Pesanan 3x → kartu hilang dari daftar aktif) sebagai satu narasi berurutan — test kedua sengaja meniru persis regresi bug nyata Fase 3 (tombol macet di "Memproses...") supaya terdeteksi otomatis kalau terulang. Database E2E terisolasi (`mygerai_test`, database kedua di Postgres lokal yang sama) via `tests/e2e/global-setup.ts`, supaya `pnpm test:e2e` tidak men-TRUNCATE data dev yang sedang dipakai untuk uji manual — dev server E2E jalan di port 3100 (terpisah dari port 3000).
- **Rate-limiting** (gap Fase 2-4): `src/lib/rate-limit/limiter.ts`, fixed-window in-memory (satu `Map`, tanpa dependency/infra baru). Diterapkan di `loginMerchant`/`loginAdmin` (5x/5menit, dicek per-IP DAN per-nomor-HP), `registerMerchant` (5x/60menit per-IP), `createOrder` (20x/10menit per-IP, longgar karena CGNAT operator seluler). Diverifikasi nyata via `tests/e2e/rate-limit.spec.ts` (percobaan berulang → diblokir dengan pesan generik) sekaligus verifikasi negatif (login sah di `order-flow.spec.ts` tidak ikut terblokir).
- **`/security-review` dua lapis** (diff Fase 5 + review manual menyeluruh `lib/auth/`, `server/orders.ts` utuh, `lib/payment/`, `server/merchants.ts` utuh, `server/admins.ts` utuh — permukaan yang sebelumnya cuma direview per-fase, belum pernah sebagai satu kesatuan): **1 temuan HIGH** — rate-limiter awalnya percaya segmen *pertama* header `x-forwarded-for`, yang bisa disisipi klien (header ini di-*append* bukan diganti oleh proxy), sehingga klien bisa memalsukan IP baru di tiap request dan melompati limit `registerMerchant`/`createOrder` (yang cuma punya lapis per-IP). **Diperbaiki**: prioritaskan `cf-connecting-ip` (selalu ditimpa Cloudflare di edge, tidak bisa dipalsukan klien), fallback ke segmen *terakhir* `x-forwarded-for` untuk dev lokal tanpa Cloudflare. Diverifikasi ulang: E2E rate-limit tetap lulus setelah perbaikan.
- **Audit performa Lighthouse**: `/menu/[stallSlug]` diaudit Lighthouse sungguhan (skor Performance 96, LCP 2.7s, CLS 0). `/checkout` & `/pesanan/[orderId]` butuh state (keranjang terisi/order nyata) yang ternyata tidak kompatibel dengan mode `--port`/isolasi Lighthouse CLI (selalu membuat context baru yang tidak berbagi localStorage meski `--disable-storage-reset`) — diukur alternatif lewat CDP Playwright dengan throttling manual setara "Slow 4G" + CPU 4x: FCP ~230-300ms, load ~280-480ms untuk alur nyata Pembeli. Tidak ada temuan yang perlu diperbaiki (satu observasi minor — 49 KiB unused JS dari bundel framework — dicatat, tidak ditindaklanjuti karena overhead hydration wajar).
- Diverifikasi nyata: `pnpm test` (24 test) & `pnpm test:e2e` (3 test) hijau di setiap tahap, `tsc --noEmit`/`pnpm lint`/`pnpm build` lulus setelah tiap perubahan (termasuk setelah perbaikan security review).

## 2026-09-05 — Fase 4 selesai: Admin & Konfigurasi (approve/reject, Biaya Layanan, Saldo & Pencairan)

**Dampak:** [docs/DATA-MODEL.md](docs/DATA-MODEL.md) (tabel `admin_sessions` baru, kolom `merchants.rejection_reason`), [docs/TEKNOLOGI.md](docs/TEKNOLOGI.md) (§Autentikasi: sesi Admin + cara buat akun Admin produksi), [docs/ARSITEKTUR-FOLDER.md](docs/ARSITEKTUR-FOLDER.md), [docs/BACKLOG.md](docs/BACKLOG.md), kode (`src/app/(admin)/**`, `src/components/admin/`, `src/lib/auth/admin-session.ts`, `src/server/{admins,config,payouts}.ts`, tambahan di `src/server/{merchants,orders}.ts`, `src/lib/db/schema.ts`, `src/lib/db/seed.ts`)
**Alasan:** Melanjutkan sesuai instruksi User setelah Fase 3 ("lanjut fase 4 dulu"). Plan mode dulu (fitur besar + menyentuh auth & uang) sesuai RULES §5.2.
**Ringkasan:**
- **Sesi Admin**: tabel `admin_sessions` **terpisah** dari `sessions` Pedagang (bukan polimorfik) — mekanisme identik (token bearer 32-byte, hash SHA-256, cookie `HttpOnly`), tapi cookie bernama `mygerai_admin_session` (beda dari `mygerai_session`) supaya kedua sesi bisa aktif berdampingan di browser yang sama. Admin tidak punya gate status seperti Pedagang — begitu password cocok, sesi langsung dibuat. Guard halaman lewat Server Component layout (`admin/(dashboard)/layout.tsx`), bukan `proxy.ts`.
- **Approve/reject Pedagang**: transisi status hanya dari `pending` (optimistic lock `WHERE status='pending'`, mencegah approve/reject ganda). Reject **wajib** menyertakan alasan (kolom baru `merchants.rejection_reason`), ditampilkan ke Pedagang saat mereka mencoba login supaya tidak perlu kontak terpisah.
- **Konfigurasi platform**: `updatePlatformConfig` hanya insert baris histori untuk key yang nilainya benar-benar berubah (bukan insert semua key setiap submit) — histori merepresentasikan kejadian nyata. `getActivePlatformConfig` dipindah dari `orders.ts` ke `server/config.ts` supaya bisa dipakai bersama alur checkout Pembeli & panel Admin tanpa duplikasi.
- **Saldo Pedagang & Pencairan**: saldo dihitung server-side lewat dua query `GROUP BY` terpisah (SUM Pesanan lunas − SUM Pencairan selesai) digabung di JS — sengaja bukan satu query dua-JOIN (mencegah fan-out SUM salah kalau satu Pedagang punya banyak Pesanan & Pencairan). `recordPayout` menghitung ulang saldo di server sebagai guard overpayment (tidak percaya batas `max` HTML semata).
- **Temuan `/security-review` & perbaikan**: race TOCTOU MEDIUM pada `recordPayout` — dua permintaan Pencairan bersamaan untuk Pedagang yang sama bisa lolos guard saldo (baca-lalu-tulis tanpa lock), berpotensi overpayment. Diperbaiki dengan membungkus baca-saldo+insert dalam `db.transaction` + `pg_advisory_xact_lock` per-`merchantId` (menyerialkan Pencairan bersamaan untuk Pedagang yang sama). Diverifikasi ulang nyata: 2 submit bersamaan (`Promise.all` dua tab) → tepat 1 berhasil, 1 ditolak dengan pesan saldo; DB dicek hanya 1 baris `payouts` tercatat.
- Diverifikasi nyata (bukan cuma baca kode, RULES §8.1): migrasi `drizzle/0002_striped_xavin.sql` diterapkan, seed diperbarui (1 akun Admin + 2 fixture Pedagang `pending` khusus approve/reject), alur penuh di browser sungguhan (Playwright) — login Admin salah/benar, isolasi sesi Admin↔Pedagang, approve→Pedagang bisa login, reject dengan alasan→pesan login berisi alasan & tidak dapat sesi, config no-op vs 1-perubahan, **snapshot Biaya Layanan lama tidak berubah retroaktif setelah config diubah** (dibuktikan lewat 2 Pesanan sebelum/sesudah), saldo bertambah tepat setelah Pesanan lunas, guard overpayment ditolak server (bukan cuma atribut HTML, dibuktikan dengan menghapus atribut `max` via JS lalu submit tetap ditolak), tidak ada `passwordHash`/`tokenHash` bocor di response Server Action manapun atau bundle `.next/static`. `tsc --noEmit`/`pnpm lint`/`pnpm build` lulus setelah perbaikan race.
- **Belum**: rate-limiting login Admin (kandidat Fase 5, sama seperti Pedagang/checkout), unit test formal.

## 2026-09-05 — Fase 3 selesai: alur inti Pedagang (registrasi, login, dashboard)

**Dampak:** [docs/TEKNOLOGI.md](docs/TEKNOLOGI.md) (§Autentikasi dituntaskan), [docs/DATA-MODEL.md](docs/DATA-MODEL.md) (tabel `sessions` baru), [docs/ARSITEKTUR-FOLDER.md](docs/ARSITEKTUR-FOLDER.md), [docs/BACKLOG.md](docs/BACKLOG.md), kode (`src/app/(merchant)/**`, `src/components/merchant/`, `src/lib/auth/`, `src/server/merchants.ts`, tambahan di `src/server/{orders,products}.ts`)
**Alasan:** Mengerjakan Fase 3 sesuai instruksi User (lanjut tanpa perlu akses Dokploy, karena fase ini murni pengembangan lokal). Plan mode dulu (fitur besar + keputusan auth) sesuai RULES §5.2.
**Ringkasan:**
- **Autentikasi dituntaskan**: hash password pakai `scrypt` bawaan `node:crypto` (bukan bcrypt/argon2 — nol dependency baru, aman dari risiko gagal compile native binding di image Docker Alpine). Sesi login DB-backed (tabel `sessions` baru): token bearer 32-byte acak di cookie `HttpOnly`+`Secure`(prod)+`SameSite=Lax`, hanya **hash SHA-256** token yang disimpan di DB. Status `approved` di-re-cek tiap request lewat sesi.
- Registrasi mandiri (`/daftar`, status awal `pending`), login (`/login`, anti-enumeration: pesan & waktu respons generik untuk kredensial salah, password benar tapi belum `approved` tidak membuat sesi — cuma tampilkan pesan status), dashboard Pedagang (`/dashboard` guard via `dashboard/layout.tsx`) — kelola Item (`/dashboard/produk`), Pesanan masuk (polling 5 detik), update status Pesanan forward-only dengan optimistic lock, unduh QR Lapak (reuse `qrcode` dari Fase 2).
- Isolasi multi-tenant (aturan dari DATA-MODEL.md §Keamanan Multi-tenant, ditulis Fase 1-2) sekarang punya implementasi konkret: setiap Server Action Pedagang mengambil identitas dari sesi (bukan parameter klien) dan memfilter `WHERE merchant_id` langsung di query — diverifikasi manual bahwa data Lapak lain tidak pernah muncul/bisa diubah.
- **Bug ditemukan & diperbaiki selama verifikasi manual** (bukan cuma baca kode — RULES §8.1): `MerchantOrderCard` lupa reset state `submitting` setelah update status Pesanan sukses, membuat tombol macet di "Memproses..." walau update di server berhasil (dikonfirmasi lewat log server: request 200 OK, tapi UI tidak reset). Diperbaiki dengan menambah `setSubmitting(false)` di jalur sukses.
- Diverifikasi nyata: Postgres lokal + seed 3 Lapak fixture (approved, pending, approved-kedua untuk uji isolasi) + Playwright browser sungguhan — alur penuh registrasi→login→dashboard→CRUD Item→Pesanan 3x update status→unduh QR→logout, termasuk uji isolasi lintas-Lapak dan cek tidak ada `passwordHash`/`tokenHash` bocor ke client (grep response Server Action & bundle `.next/static`). `tsc`/`lint`/`build` lulus.
- `/security-review` dijalankan — 1 temuan MEDIUM (tidak ada rate-limiting `loginMerchant`/`registerMerchant`, dikecualikan oleh aturan skill tapi dicatat sebagai gap nyata, kandidat Fase 5) + 1 LOW (parameter `status` di `setProductStatus` tidak divalidasi Zod — bukan celah otorisasi karena Postgres enum tetap menolak nilai salah, tapi langsung diperbaiki untuk konsistensi).
- **Tertunda ke Fase 5**: rate-limiting login/registrasi, unit test formal (sama seperti preseden Fase 2).

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
