# Backlog

> Aturan pakai: fitur baru (di luar bugfix kecil) harus masuk daftar ini dulu sebelum dikerjakan (lihat [RULES.md §5](RULES.md#5-alur-kerja-fitur)). Update centang `[x]` saat selesai, dan tambah entri di [CHANGELOG.md](../CHANGELOG.md) untuk perubahan yang berdampak ke ground truth. Pindahkan item ke bagian "Selesai" seperlunya kalau daftar aktif mulai panjang.

## Fase 0 — Fondasi (Ground Truth) ✅

- [x] Riset ESB / ESB Order sebagai inspirasi.
- [x] Susun seluruh dokumen ground truth (`docs/*`, `CLAUDE.md`, `README.md`, `CHANGELOG.md`).
- [x] Konfirmasi keputusan bisnis kunci: model settlement (Agregator), status badan usaha (perorangan), model onboarding Pedagang (self-service + approval), payment MVP disimulasikan.

## Fase 1 — Setup Proyek

- [ ] Scaffold proyek Next.js (App Router) + TypeScript + Tailwind + Biome.
- [ ] Setup Supabase project (DB, Auth, Realtime, Storage) + environment variables.
- [ ] Setup Drizzle ORM + migrasi awal berdasarkan [DATA-MODEL.md](DATA-MODEL.md).
- [ ] Terapkan RLS policy dasar sesuai [DATA-MODEL.md §Keamanan Multi-tenant](DATA-MODEL.md#keamanan-multi-tenant-row-level-security).
- [ ] Setup deployment Vercel (staging).
- [ ] Buat `.claude/settings.json` dengan permission dasar (izinkan command `pnpm`/`git` umum tanpa prompt berulang) — lihat [CLAUDE-SKILLS.md §Skill Bawaan vs Skill/Konfigurasi Custom](CLAUDE-SKILLS.md#skill-bawaan-vs-skillkonfigurasi-custom-claude).

## Fase 2 — Alur Inti Pembeli (dengan Payment Simulasi)

- [ ] Implementasi `PaymentProvider` interface + `MockPaymentProvider` ([TEKNOLOGI.md](TEKNOLOGI.md#payment-provider-abstraction)).
- [ ] Halaman katalog Lapak (`/menu/[stallSlug]`) — daftar Item, harga, foto.
- [ ] Keranjang sisi klien (pilih Item, qty, catatan).
- [ ] Halaman checkout (form Nama + ringkasan).
- [ ] Server Action buat Pesanan (hitung ulang total di server, snapshot Biaya Layanan).
- [ ] Halaman status Pesanan + tombol "Simulasikan Pembayaran Berhasil" + tampilan Kode Pesanan.
- [ ] Kedaluwarsa Pesanan otomatis (lazy check, lihat [ARSITEKTUR-SISTEM.md](ARSITEKTUR-SISTEM.md#kedaluwarsa-pesanan)).

## Fase 3 — Alur Inti Pedagang

- [ ] Halaman daftar Pedagang baru (onboarding, status `pending`).
- [ ] Login Pedagang (nomor HP + password).
- [ ] Dashboard: kelola Item (tambah/edit/tandai habis).
- [ ] Dashboard: daftar Pesanan masuk real-time (Supabase Realtime).
- [ ] Update status Pesanan (`diproses` → `siap_diambil` → `selesai`).
- [ ] Generate & download/cetak QR Lapak.

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
