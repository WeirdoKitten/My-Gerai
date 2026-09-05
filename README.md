# MyGerai

Sistem pemesanan berbasis **QR code + QRIS** untuk pedagang kecil pinggir jalan/pasar (bakso, batagor, cakue, pedagang baju, dll) — versi sederhana dari **[ESB Order](https://www.esb.id/id/solusi/produk/order)**, disesuaikan untuk skala usaha mikro.

**Alur singkat:** Pembeli scan QR di lapak → pilih Item → isi Nama → bayar QRIS → begitu lunas, Pesanan otomatis masuk ke Pedagang untuk disiapkan. **Tidak perlu login/daftar akun** untuk Pembeli.

> Status: **Tahap ground truth / perencanaan** — dokumen fondasi sudah lengkap, kode aplikasi belum dimulai. Lihat [docs/BACKLOG.md](docs/BACKLOG.md) untuk rencana ke depan.

## Mulai Dari Mana

Kalau Anda (manusia atau Claude) baru di proyek ini, baca **[CLAUDE.md](CLAUDE.md)** dulu — itu adalah peta ke semua dokumen ground truth di folder [docs/](docs/), termasuk:

- [Spesifikasi produk (PRD)](docs/PRD.md)
- [Arsitektur sistem](docs/ARSITEKTUR-SISTEM.md) & [struktur folder](docs/ARSITEKTUR-FOLDER.md)
- [Stack teknologi & alasannya](docs/TEKNOLOGI.md)
- [Model data](docs/DATA-MODEL.md)
- [Backlog / rencana kerja](docs/BACKLOG.md)
- [Aturan pengembangan](docs/RULES.md), [gaya kode](docs/CODING-STYLE.md), [best practices](docs/BEST-PRACTICES.md)
- [Glosarium istilah](docs/GLOSSARY.md)
- [Tips prompt untuk kolaborasi dengan Claude](docs/PROMPT-TIPS.md)

Semua perubahan besar dicatat di [CHANGELOG.md](CHANGELOG.md).

## Inspirasi

Dibangun terinspirasi dari [ESB](https://www.esb.id/id), khususnya fitur **ESB Order** (scan QR di meja → pilih menu → isi data singkat tanpa akun → bayar → pesanan masuk ke dapur/kasir). MyGerai menyederhanakan alur ini untuk pedagang kaki lima: satu metode bayar (QRIS), tanpa konsep meja, dan Pembeli hanya perlu mengisi nama.
