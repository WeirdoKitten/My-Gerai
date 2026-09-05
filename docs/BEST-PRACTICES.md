# Best Practices

## Performa

Halaman **Pembeli** adalah prioritas performa tertinggi — diakses lewat scan QR, seringkali dari HP low-end & koneksi data pasar/jalanan yang bisa lambat.

- Gunakan **React Server Components** sebisa mungkin untuk halaman Pembeli; batasi `"use client"` hanya untuk bagian yang benar-benar butuh interaktivitas (mis. tombol tambah ke Keranjang, tombol simulasi pembayaran).
- Optimasi gambar Item/Lapak lewat `next/image` (otomatis resize & format modern) — jangan upload/tampilkan foto resolusi asli tanpa kompresi.
- Hindari library JS berat di halaman Pembeli (cek ukuran bundle sebelum menambah dependency baru).
- Target: halaman katalog & checkout tetap terasa instan di simulasi jaringan "Slow 3G/4G" (cek manual di DevTools sebelum menandai fitur selesai).
- Dashboard Pedagang/Admin boleh lebih "berat" secara wajar (dipakai di tempat lebih stabil, sesi lebih lama) — tapi tetap hindari pemborosan yang tidak perlu.

## Keamanan

- Lihat [RULES.md §7](RULES.md#7-keamanan) untuk aturan wajib (secrets, verifikasi webhook, RLS).
- Validasi **semua** input dari klien pakai Zod di sisi server — jangan percaya validasi sisi klien saja.
- Total harga Pesanan **selalu dihitung ulang di server** dari data `products` terkini, tidak pernah dipercaya dari payload klien (lihat [ARSITEKTUR-SISTEM.md](ARSITEKTUR-SISTEM.md)).
- Rate-limit endpoint checkout & login untuk mencegah spam/brute-force sederhana (boleh solusi ringan dulu, mis. batas per IP, bukan infrastruktur mahal).
- Jangan pernah expose `DATABASE_URL`, `password_hash`, atau kredensial lain ke sisi klien — koneksi database hanya dipakai di server (Server Actions/Route Handlers), respons ke klien selalu lewat tipe hasil eksplisit, bukan raw row database.

## Error Handling

- **Gagal jelas (fail loud) untuk bug** — jangan menelan error diam-diam yang menyembunyikan kesalahan logika (mis. gagal hitung total).
- **Gagal ramah (fail gracefully) untuk kesalahan input pengguna** — tampilkan pesan Bahasa Indonesia yang jelas (mis. "Item ini baru saja habis, silakan pilih yang lain") alih-alih pesan error teknis mentah.
- Jangan menambah `try/catch` yang membungkam error tanpa alasan — lihat [RULES.md §4](RULES.md#4-prioritas-desain), hanya validasi di titik yang benar-benar perlu (boundary sistem: input pengguna, respons API eksternal).

## Testing

- Unit test wajib untuk logika perhitungan uang: total Pesanan, snapshot Biaya Layanan, status kedaluwarsa.
- E2E test (Playwright) minimal mencakup: alur checkout penuh (Pembeli) dan alur terima+selesaikan Pesanan (Pedagang) — dua alur paling kritikal di produk ini.
- Untuk fitur UI, ikuti instruksi global: jalankan aplikasi & coba fitur di browser (skill `run`) sebelum melaporkan selesai — test otomatis memverifikasi kebenaran kode, bukan kebenaran fitur dari sudut pandang pengguna.

## Aksesibilitas Praktis

Target pengguna Pedagang & Pembeli beragam usia dan literasi digital:

- Ukuran tombol & teks cukup besar untuk diketuk/dibaca di layar HP kecil.
- Kontras warna cukup (jangan teks abu-abu tipis di atas latar putih).
- Alur checkout sesedikit mungkin langkah — setiap langkah tambahan adalah friksi bagi Pembeli yang mungkin sedang buru-buru di pinggir jalan.

## Internasionalisasi

Tidak diperlukan untuk MVP — UI dan pesan **Bahasa Indonesia saja** (lihat [RULES.md §1](RULES.md#1-bahasa)). Jangan membangun infrastruktur i18n (library, file terjemahan) sebelum benar-benar dibutuhkan — itu over-engineering untuk skala saat ini.
