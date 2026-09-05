# Backlog

> Aturan pakai: fitur baru (di luar bugfix kecil) harus masuk daftar ini dulu sebelum dikerjakan (lihat [RULES.md §5](RULES.md#5-alur-kerja-fitur)). Update centang `[x]` saat selesai, dan tambah entri di [CHANGELOG.md](../CHANGELOG.md) untuk perubahan yang berdampak ke ground truth. Pindahkan item ke bagian "Selesai" seperlunya kalau daftar aktif mulai panjang.

## Fase 0 — Fondasi (Ground Truth) ✅

- [x] Riset ESB / ESB Order sebagai inspirasi.
- [x] Susun seluruh dokumen ground truth (`docs/*`, `CLAUDE.md`, `README.md`, `CHANGELOG.md`).
- [x] Konfirmasi keputusan bisnis kunci: model settlement (Agregator), status badan usaha (perorangan), model onboarding Pedagang (self-service + approval), payment MVP disimulasikan.

## Fase 1 — Setup Proyek

- [x] Scaffold proyek Next.js (App Router) + TypeScript + Tailwind + Biome. — `pnpm build`/`pnpm exec tsc --noEmit`/`pnpm lint` lulus.
- [ ] Setup PostgreSQL self-hosted di server Garuda (via Dokploy) + Cloudflare Tunnel + environment variables. — perlu akses server User (Dokploy dashboard/SSH), lihat CHANGELOG.md 2026-09-05.
- [x] Setup Drizzle ORM + migrasi awal berdasarkan [DATA-MODEL.md](DATA-MODEL.md). — skema (`src/lib/db/schema.ts`) & migrasi awal (`drizzle/0000_*.sql`) sudah digenerate & tervalidasi (`drizzle-kit generate`); **belum** di-push ke database sungguhan (menunggu Postgres di Garuda siap).
- [x] ~~Terapkan RLS policy dasar~~ — **digantikan**: isolasi multi-tenant sekarang di level aplikasi (bukan RLS database), lihat [DATA-MODEL.md §Keamanan Multi-tenant](DATA-MODEL.md#keamanan-multi-tenant-isolasi-level-aplikasi). Aturannya sudah didokumentasikan; penerapan konkret (filter di tiap Server Action) menyusul di Fase 2-4 seiring fitur ditulis.
- [ ] Setup deployment aplikasi Next.js ke server Garuda via Dokploy (staging). — `Dockerfile` (multi-stage, `output: "standalone"`) sudah dibuat & diverifikasi lokal (`docker build` + `docker run` + konek ke Postgres via `host.docker.internal` berhasil); deploy sungguhan ke Dokploy masih perlu dikerjakan User (akses dashboard/server tidak dimiliki Claude).
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

## Fase 4 — Admin & Konfigurasi

- [ ] Login Admin.
- [ ] Approve/reject Pedagang baru.
- [ ] Halaman konfigurasi: ubah `platform_fee_amount`, `order_expiry_minutes` (dengan histori, lihat [DATA-MODEL.md](DATA-MODEL.md#platform_config-konfigurasi-aplikator)).
- [ ] Halaman daftar transaksi & Saldo Pedagang per Lapak.
- [ ] Pencatatan Pencairan manual.

## Fase 5 — Pengujian & Pengerasan (Hardening)

- [ ] Unit test untuk kalkulasi harga, Biaya Layanan snapshot, kedaluwarsa.
- [ ] E2E test (Playwright): alur checkout penuh (buyer) + alur terima pesanan (merchant).
- [ ] `/security-review` untuk seluruh alur pembayaran & auth (lihat [CLAUDE-SKILLS.md](CLAUDE-SKILLS.md)).
- [ ] Audit performa halaman Pembeli (Lighthouse, lihat [BEST-PRACTICES.md](BEST-PRACTICES.md#performa)).

## Fase 6 — Integrasi Payment Nyata (Tripay)

- [ ] Daftar akun Tripay (perorangan, KTP) — dilakukan User, bukan Claude.
- [ ] Implementasi `TripayPaymentProvider` (createPayment via API Tripay).
- [ ] Endpoint webhook `/api/webhooks/payment` + verifikasi signature Tripay.
- [ ] Uji coba transaksi nyata nominal kecil sebelum go-live penuh.
- [ ] Rencana migrasi: matikan `MockPaymentProvider` di production, pastikan tidak ada campur data `provider=mock` di laporan (lihat [DATA-MODEL.md](DATA-MODEL.md#payments)).

## Backlog Ide Masa Depan (belum dijadwalkan, lihat [PRD.md §5](PRD.md#5-di-luar-lingkup-mvp-out-of-scope--dicatat-sebagai-ide-masa-depan-di-backlogmd))

- [ ] OTP untuk login Pedagang/Admin (hardening keamanan).
- [ ] Pencairan otomatis via disbursement API.
- [ ] Varian Item (ukuran, level pedas, dll).
- [ ] Multi-Lapak per Pedagang.
- [ ] Notifikasi WhatsApp ke Pedagang saat ada Pesanan baru.
- [ ] Laporan analitik penjualan (harian/mingguan) untuk Pedagang & Admin.
- [ ] PWA "Add to Home Screen" untuk halaman Pembeli.
- [ ] Pengelompokan Lapak per lokasi/pasar fisik.
