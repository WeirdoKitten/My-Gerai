# Aturan Penulisan Kode

## Bahasa dalam Kode

- Identifier (variabel, fungsi, tipe, komponen, tabel/kolom database): **Bahasa Inggris**, konvensi industri (lihat [RULES.md §1](RULES.md#1-bahasa)).
- Komentar kode: default **tidak menulis komentar** (lihat instruksi global "Default to writing no comments"). Kalau benar-benar perlu (alasan non-obvious, workaround, invarian tersembunyi), tulis singkat dalam **Bahasa Indonesia**.
- Pesan error yang tampil ke pengguna (Pembeli/Pedagang/Admin): **Bahasa Indonesia**.
- String log internal (`console.log`/log server, bukan untuk pengguna): boleh Bahasa Inggris.

## Pemetaan Istilah Domain

| Istilah Indonesia (dipakai di UI/docs) | Istilah Inggris (dipakai di kode) |
|---|---|
| Pedagang / Lapak | `Merchant` / `Stall` (MVP: 1 tabel `merchants`, lihat [DATA-MODEL.md](DATA-MODEL.md)) |
| Pembeli | `Buyer` (tidak ada tabel akun, hanya field `buyer_name`) |
| Item | `Product` |
| Keranjang | `Cart` |
| Pesanan | `Order` |
| Kode Pesanan | `orderCode` |
| Status Pesanan | `OrderStatus` (enum: lihat [DATA-MODEL.md](DATA-MODEL.md#orders-pesanan)) |
| QR Lapak | `StallQrCode` |
| Biaya Layanan | `platformFee` |
| Saldo Pedagang | `merchantBalance` (nilai turunan, bukan kolom, lihat [DATA-MODEL.md](DATA-MODEL.md#payouts-pencairan)) |
| Pencairan | `Payout` |
| Aplikator | `Platform` (konteks umum, jarang jadi nama entitas eksplisit) |

## Konvensi Penamaan

- Variabel & fungsi: `camelCase`.
- Komponen React & Type/Interface: `PascalCase`.
- File komponen: `PascalCase.tsx` (mis. `ProductCard.tsx`); file non-komponen: `kebab-case.ts` (mis. `mock-provider.ts`).
- Kolom & tabel database: `snake_case` (default konvensi Postgres/Drizzle).
- Konstanta konfigurasi tetap (bukan dari `platform_config` DB): `UPPER_SNAKE_CASE`.

## TypeScript

- `strict: true` di `tsconfig.json` — tidak ada pengecualian tanpa alasan kuat yang didiskusikan dulu.
- Hindari `any`; kalau tipe benar-benar belum jelas, pakai `unknown` dan sempitkan (narrow) eksplisit.
- Tipe domain inti (Order, Product, Merchant, dll) didefinisikan sekali di `src/types/` atau diturunkan dari skema Drizzle — jangan duplikasi definisi tipe yang sama di banyak tempat.

## Validasi

- Semua data masuk dari form/klien divalidasi pakai **Zod** di server (Server Action), bukan hanya di klien.
- Skema Zod diletakkan di `src/lib/validation/`, dinamai sesuai domain (mis. `checkout.schema.ts`).

## Commit Message

- Format: [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, dst) dengan **deskripsi dalam Bahasa Indonesia**.
- Contoh: `feat: tambah halaman katalog Lapak untuk Pembeli`, `fix: perbaiki perhitungan Biaya Layanan saat kedaluwarsa`.
- Setiap commit yang mengubah ground truth (`docs/*`) harus disebutkan eksplisit di pesan commit, bukan disembunyikan dalam commit fitur yang tidak terkait.

## Import Order

Urutan: (1) modul eksternal (`react`, `next`, dst) → (2) alias internal (`@/lib`, `@/components`, dst) → (3) relatif (`./`, `../`). Dipisah baris kosong antar kelompok. Diberlakukan otomatis lewat konfigurasi Biome saat scaffolding (lihat [BACKLOG.md](BACKLOG.md) Fase 1).

## Struktur Fungsi Server Action

- Satu Server Action = satu operasi bisnis yang jelas namanya (mis. `createOrder`, `markOrderReady`), bukan fungsi generik serba bisa.
- Urutan di dalam: validasi input (Zod) → cek otorisasi (identitas dari sesi login, filter kepemilikan eksplisit — lihat [DATA-MODEL.md §Keamanan Multi-tenant](DATA-MODEL.md#keamanan-multi-tenant-isolasi-level-aplikasi)) → logika bisnis → tulis DB → return hasil yang sudah divalidasi bentuknya, bukan raw row database.
