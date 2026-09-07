# Desain Sistem — Tampilan MyGerai

> Ground truth untuk **tampilan**: warna, tipografi, spacing, komponen baku, aturan layout. Tujuannya satu: setiap halaman (Pembeli, Pedagang, Admin) terasa **satu produk yang sama** — rapi, hangat, nyaman dilihat, dan sederhana.
>
> Setiap kali menambah/mengubah UI, ikuti dokumen ini. Kalau butuh pola baru yang belum ada di sini, tambahkan dulu ke dokumen ini (+ [CHANGELOG.md](../CHANGELOG.md)) sebelum menyebarnya ke banyak halaman.

## 1. Prinsip

1. **Hangat & menggugah selera.** Aksen oranye, sudut membulat, bayangan lembut, latar seperti kertas. Bukan hitam-putih korporat.
2. **Sederhana sebelum cantik.** Satu kolom, hierarki jelas, ruang napas cukup. Tidak ada dekorasi yang tidak berfungsi (KISS, [RULES.md §4](RULES.md#4-prioritas-desain)).
3. **Terang saja.** Tidak ada dark mode. Semua kelas `dark:` dihapus. Lebih mudah dijaga konsisten & lebih terbaca saat scan QR di luar ruangan.
4. **Mobile lebih dulu.** Halaman Pembeli dirancang untuk HP kecil + jaringan lambat; desktop = kolom yang sama, di tengah, di atas latar hangat. Tombol & teks cukup besar untuk diketuk/dibaca ([BEST-PRACTICES.md §Aksesibilitas](BEST-PRACTICES.md#aksesibilitas-praktis)).
5. **Konsisten lewat komponen, bukan hafalan.** Semua elemen berulang (tombol, input, kartu, label status) dibuat sekali di `src/components/ui/` dan dipakai ulang — jangan tulis ulang kelas Tailwind panjang di tiap halaman.

## 2. Token (didefinisikan di `src/app/globals.css` via `@theme`)

### Warna

| Token | Hex | Utility Tailwind | Dipakai untuk |
|---|---|---|---|
| `--color-bg` | `#FAF6F1` | `bg-bg` | Latar halaman (warm paper) |
| `--color-surface` | `#FFFFFF` | `bg-surface` | Kartu, panel, input |
| `--color-ink` | `#1C1917` | `text-ink` | Teks utama (near-black hangat, **bukan** `#000`) |
| `--color-ink-muted` | `#78716C` | `text-ink-muted` | Teks sekunder, keterangan (kontras 4.8:1 di atas putih) |
| `--color-line` | `#EAE3DB` | `border-line` | Garis pemisah & border kartu/input |
| `--color-brand` | `#EA580C` | `bg-brand` `text-brand` `border-brand` | Aksen merek — **hanya** untuk elemen besar/ikon/border, **bukan** teks paragraf |
| `--color-brand-strong` | `#C2410C` | `bg-brand-strong` `text-brand-strong` | Tombol utama, link, teks kecil beraksen (kontras putih 5.6:1) |
| `--color-brand-tint` | `#FFF1E7` | `bg-brand-tint` | Latar state aktif/terpilih, callout lembut |
| `--color-success` | `#15803D` | `text-success` | Teks status sukses / "siap diambil" |
| `--color-success-bg` | `#F0FDF4` | `bg-success-bg` | Latar badge/alert sukses |
| `--color-warning` | `#B45309` | `text-warning` | Teks status "menunggu pembayaran" |
| `--color-warning-bg` | `#FEF3C7` | `bg-warning-bg` | Latar badge/alert peringatan |
| `--color-danger` | `#DC2626` | `text-danger` | Error, status "dibatalkan", aksi hapus |
| `--color-danger-bg` | `#FEF2F2` | `bg-danger-bg` | Latar alert error |
| `--color-info` | `#1D4ED8` | `text-info` | Status "dibayar"/"diproses" |
| `--color-info-bg` | `#EFF6FF` | `bg-info-bg` | Latar badge info |
| `--color-neutral-bg` | `#F4F1EC` | `bg-neutral-bg` | Latar badge netral ("selesai"/"kedaluwarsa") |

Warna hitam murni (`#000`, `text-black`, `bg-black`), abu Tailwind polos (`zinc-*`, `slate-*`, `gray-*`), dan warna arbitrer sekali-pakai **dilarang** — selalu lewat token di atas.

### Tipografi

- **Font:** **Plus Jakarta Sans** (via `next/font/google`), bobot 400/500/600/700. Fallback: `ui-sans-serif, system-ui, -apple-system, sans-serif`. Menggantikan Geist. Tidak ada font mono — untuk kode/angka pakai `tabular-nums`.
- **Ukuran dasar:** `body` = **15px**, `line-height: 1.5`.

| Peran | Kelas | 
|---|---|
| Judul halaman (h1) | `text-xl font-bold tracking-tight text-ink` |
| Judul bagian (h2) | `text-lg font-semibold text-ink` |
| Teks isi | default (15px) `text-ink` |
| Teks sekunder | `text-sm text-ink-muted` |
| Mikro (hint, timestamp) | `text-xs text-ink-muted` |
| Kode Pesanan (tampilan besar) | `text-3xl font-extrabold tracking-[0.15em] tabular-nums text-ink` |
| Harga / angka / qty | tambahkan `tabular-nums` |

### Bentuk & elevasi

| Token | Nilai | Utility | Dipakai |
|---|---|---|---|
| `--radius-card` | `1rem` (16px) | `rounded-card` | Kartu, panel, alert |
| `--radius-control` | `0.75rem` (12px) | `rounded-control` | Tombol, input, textarea |
| pill | — | `rounded-full` | Badge status, stepper qty, floating cart bar |
| `--shadow-card` | `0 1px 2px rgb(28 25 23 / 0.04), 0 12px 28px -16px rgb(234 88 12 / 0.14)` | `shadow-card` | Elemen mengambang / kartu kunci. **Hemat** — mayoritas kartu cukup border. |

- Transisi: `transition-colors` untuk hover/focus, durasi default. Hormati `prefers-reduced-motion` (jangan animasi geser/skala yang mencolok).

## 3. Komponen baku (`src/components/ui/`)

Semua resep di bawah adalah kelas kanonik — implementasikan sebagai komponen, jangan salin kelasnya ke halaman.

### `Button.tsx`
Basis: `inline-flex items-center justify-center gap-2 rounded-control font-semibold transition-colors disabled:opacity-60 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand`

| Varian | Kelas tambahan |
|---|---|
| `primary` (default) | `bg-brand-strong text-white hover:bg-[#9A3412]` |
| `secondary` | `bg-surface text-ink border border-line hover:bg-bg` |
| `ghost` | `text-brand-strong hover:bg-brand-tint` |
| `danger` | `bg-danger text-white hover:bg-danger-hover` — aksi hapus destruktif |
| `dangerOutline` | `border border-danger text-danger hover:bg-danger hover:text-white` — aksi merah yang lebih tenang (mis. "Keluar") |

| Ukuran | Kelas |
|---|---|
| `md` (default) | `h-11 px-5 text-[15px]` |
| `sm` | `h-9 px-3.5 text-sm` |

Props: `variant`, `size`, `fullWidth` (→ `w-full`), `loading` (tampilkan `Spinner` + teks tetap, set `disabled`). Tinggi minimum tap target 44px → jangan bikin lebih kecil dari `sm` untuk aksi penting.

### `Input.tsx` / `Textarea.tsx`
`h-11 w-full rounded-control border border-line bg-surface px-3.5 text-[15px] text-ink placeholder:text-ink-muted focus:border-brand focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand`
(Textarea: ganti `h-11` → `min-h-24 py-2.5`.) State error: tambahkan `border-danger`.

### `Field.tsx`
Bungkus label + kontrol:
```
<label class="flex flex-col gap-1.5">
  <span class="text-sm font-semibold text-ink">{label}</span>
  {children}
  {hint  && <span class="text-xs text-ink-muted">{hint}</span>}
  {error && <span class="text-xs font-medium text-danger">{error}</span>}
</label>
```

### `Card.tsx`
`rounded-card border border-line bg-surface p-4` — prop `as` (div/section), prop opsional `elevated` (→ tambah `shadow-card`, hilangkan border).

### `Badge.tsx`
`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold` + tone:

| tone | kelas |
|---|---|
| `neutral` | `bg-neutral-bg text-ink-muted` |
| `primary` | `bg-brand-tint text-brand-strong` |
| `success` | `bg-success-bg text-success` |
| `warning` | `bg-warning-bg text-warning` |
| `danger` | `bg-danger-bg text-danger` |
| `info` | `bg-info-bg text-info` |

### `OrderStatusBadge.tsx`
Peta status → tone (pakai label dari `ORDER_STATUS_LABEL_ID` yang sudah ada):

| Status | tone |
|---|---|
| `menunggu_pembayaran` | `warning` |
| `dibayar` | `info` |
| `diproses` | `info` |
| `siap_diambil` | `success` |
| `selesai` | `neutral` |
| `dibatalkan` | `danger` |
| `kedaluwarsa` | `neutral` |

### `Alert.tsx`
`rounded-control px-3.5 py-3 text-sm` + tone: `error` (`bg-danger-bg text-danger`), `success` (`bg-success-bg text-success`), `info` (`bg-info-bg text-info`), `warning` (`bg-warning-bg text-warning`). Ganti semua `<p class="text-sm text-red-600">` yang tersebar sekarang dengan ini.

### `QuantityStepper.tsx`
`inline-flex items-center rounded-full border border-line bg-surface` · tombol `h-9 w-9 text-lg leading-none text-ink disabled:opacity-40` · nilai `w-8 text-center text-[15px] tabular-nums`. Dipakai di `AddToCartControls` **dan** `CartSummary` (sekarang dobel).

### `PageHeader.tsx`
```
<div class="flex flex-col gap-1">
  <h1 class="text-xl font-bold tracking-tight text-ink">{title}</h1>
  {subtitle && <p class="text-sm text-ink-muted">{subtitle}</p>}
</div>
```

### `Modal.tsx`
Dialog berbasis `<dialog>` bawaan (Esc + focus-trap + backdrop gratis). Panel `max-w-lg`, header (judul + tombol ✕), body `max-h-[75vh] overflow-y-auto`. Klik backdrop menutup. Dipakai untuk form Tambah/Ubah Item (bukan inline lagi).

### `EmptyState.tsx`
Tengah, `py-12`, ikon SVG `size-10 text-ink-muted`, judul `font-semibold text-ink`, keterangan `text-sm text-ink-muted`, opsional tombol. Ganti teks polos "Belum ada Pesanan masuk." / "Belum ada Item tersedia." dll.

### `Spinner.tsx`
SVG lingkaran `animate-spin size-4`, `currentColor`.

## 4. Layout

**Mobile-first, satu kolom.** Semua permukaan = kolom di tengah, `bg-bg` mengisi samping. Tidak ada grid multi-kolom / breakpoint layout (dicoba 2026-09-08, di-revert — hasilnya jelek di layar lebar). Konten baru mengikuti pola ini kecuali ada alasan kuat.

| Permukaan | Lebar |
|---|---|
| Pembeli (menu, checkout, status, 404) — `(buyer)/layout.tsx` | `max-w-md`, wordmark kecil di atas |
| Halaman auth (login/daftar) | `max-w-sm`, center V+H |
| Landing `/` | `max-w-md`, 1 kolom |
| Dashboard Pedagang (`DashboardShell` width `max-w-2xl`) | `max-w-2xl`, `px-4 py-6` |
| Panel Admin (`DashboardShell` width `max-w-3xl`) | `max-w-3xl` |

- **Root:** `<body>` = `min-h-dvh bg-bg text-ink font-sans`. Kartu (`bg-surface`) yang memberi kontras.
- **Dashboard = pola aplikasi HP** (komponen `DashboardShell`): **top bar** sticky (`bg-bg/85 backdrop-blur`) berisi slot `brand` di kiri (Pedagang = **nama Lapak** via `<Wordmark label={stallName}>` + baris kecil opsional; Admin = `<Wordmark>` "MyGerai" + `Admin · <nama>`) + `headerAction` + tombol **Keluar** (`dangerOutline`). **Bottom nav** `fixed` (`DashboardNav`): ikon + label per tab, `max-w-md` di tengah, aktif = `text-brand-strong`, tab "index" (`/dashboard`) aktif hanya saat cocok **persis**. Konten `<main>` pakai `pb-24` supaya tidak tertutup bottom nav. `NavItem.icon` = **string** (bukan komponen) supaya bisa dilempar dari Server Component.
- **Tombol Profil Pedagang** = ikon (`UserIcon`) di `headerAction`, `<Link>` ber-`aria-label`, kotak `size-9 border border-line rounded-control`.
- **Jarak antar-blok** dalam satu halaman: `gap-4` (padat) atau `gap-6` (longgar, antar-seksi). Konsisten pakai `flex flex-col gap-*`, bukan `space-y` campur `mb-*`.
- **Grid Item (menu Pembeli):** tetap **satu kolom** untuk MVP (fokus & sederhana). Multi-kolom di desktop dicatat sebagai peningkatan opsional, bukan sekarang.

## 5. Pola spesifik

- **Kartu Item Pembeli (`ProductCard`):** foto kiri `size-20 rounded-control object-cover` (via `next/image`), placeholder tanpa foto = `bg-brand-tint` + ikon. Nama `font-semibold`, deskripsi `text-sm text-ink-muted line-clamp-2`, harga `font-bold text-ink tabular-nums`. Catatan (opsional) satu baris penuh, lalu baris stepper + tombol "Tambah". _(Item `sold_out` tidak pernah sampai ke Pembeli — `getStallCatalog` sudah memfilternya.)_
- **Baris Item Pedagang (`ProductListItem`):** Item `sold_out` → seluruh baris `opacity-70`. Aksi kanan = 2 pil ber-**border** (supaya jelas tombol, bukan teks): (1) toggle status `role="switch"` — titik + "Tersedia"/"Habis", hijau saat aktif; (2) "Ubah" (border) buka `Modal` form.
- **Floating cart bar:** pill mengambang `fixed inset-x-4 bottom-4 mx-auto max-w-md h-14 rounded-full bg-brand-strong text-white shadow-card px-5`, kiri "N item", kanan harga `tabular-nums` + ikon panah. Muncul hanya kalau keranjang berisi.
- **Halaman status Pesanan:** Kode Pesanan jadi "hero" (lihat tipografi), badge status di bawahnya. QR pembayaran dalam `Card`. Tombol simulasi = `Button variant="primary" fullWidth`.
- **Dashboard Pedagang — kartu Pesanan:** Kode Pesanan `text-lg font-bold tabular-nums`, `OrderStatusBadge` di kanan, daftar item ringkas, satu tombol aksi lebar untuk maju status.
- **Foto:** selalu `next/image`, `object-cover`, rasio tetap (`aspect-square` untuk Item). Jangan render `<img>` mentah kecuali data URI (QR).
- **Angka uang:** selalu lewat `formatRupiah` + kelas `tabular-nums`.

## 6. Ikon

Tidak pakai library ikon (berat untuk halaman Pembeli). Kumpulan kecil **inline SVG** di `src/components/ui/icons.tsx` — perkiraan yang dibutuhkan: `cart`, `arrow-right`, `check`, `plus`, `minus`, `image-off`, `store`, `chevron-down`. `stroke="currentColor"`, `size-*` dari kelas. Emoji hanya untuk EmptyState kalau memang pas, bukan di UI inti.

## 7. Yang dihindari

- ❌ Kelas `dark:` apa pun.
- ❌ `text-black` / `bg-black` / `#000` / `zinc-*` / `gray-*` / `slate-*`.
- ❌ Warna hex arbitrer di halaman (kecuali nilai hover yang sudah ditetapkan dokumen ini).
- ❌ Menyalin string kelas tombol/input/kartu ke halaman — wajib lewat komponen `ui/`.
- ❌ Menambah dependency UI/ikon/animasi tanpa update [TEKNOLOGI.md](TEKNOLOGI.md) + izin User.
- ❌ Menjadikan halaman Pembeli `"use client"` hanya demi styling — styling tidak butuh klien ([BEST-PRACTICES.md §Performa](BEST-PRACTICES.md#performa)).

## 8. Status implementasi

Fase Tampilan **selesai** (2026-09-07, lihat [CHANGELOG.md](../CHANGELOG.md)):

- [x] `globals.css` token `@theme` + font Plus Jakarta Sans + `body` base.
- [x] `src/components/ui/` — semua primitif di §3 + `Wordmark`, `ButtonLink`; kerangka bersama `AuthShell`, `DashboardShell`, `DashboardNav`.
- [x] Halaman Pembeli: `page.tsx` (landing), `menu`, `checkout`, `pesanan`, `not-found`.
- [x] Pedagang: layout dashboard, `dashboard`, `produk`, `login`, `daftar`.
- [x] Admin: layout, `merchants`, `config`, `payouts`, `login`.
- [x] Nol sisa `dark:` / `zinc-*` / `#000`. `tsc` / `lint` / `build` / `pnpm test` lulus; diverifikasi visual di browser (desktop + mobile) via Playwright.

Perubahan UI berikutnya: tetap rakit dari `ui/`, jangan salin string kelas panjang; kalau butuh pola baru, tambahkan ke dokumen ini dulu.
