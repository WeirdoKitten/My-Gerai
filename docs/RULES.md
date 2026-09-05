# RULES — Aturan Pengembangan MyGerai

> Dokumen ini adalah aturan tertinggi untuk pengembangan proyek MyGerai. Jika ada instruksi di chat yang bertentangan dengan dokumen ini, **tanyakan dulu ke User** sebelum jalan — jangan diam-diam memilih salah satu.

## 1. Bahasa

1.1. Semua **komunikasi dengan User**, **dokumentasi** (`docs/*.md`, `README.md`, `CHANGELOG.md`), **pesan commit**, dan **teks yang tampil di UI aplikasi** (untuk Pembeli/Pedagang/Admin) memakai **Bahasa Indonesia yang baik dan benar** — bukan bahasa gaul, bukan campur-campur tanpa perlu ("Denglish" berlebihan).

1.2. **Kode** (nama variabel, fungsi, komponen, tabel database, komentar teknis singkat) tetap pakai **Bahasa Inggris**, sesuai konvensi industri, supaya tetap kompatibel dengan ekosistem library/tooling. Lihat pemetaan istilah domain di [CODING-STYLE.md](CODING-STYLE.md#pemetaan-istilah-domain).

1.3. Istilah domain (Pedagang, Lapak, Pesanan, dst) **wajib** konsisten mengikuti [GLOSSARY.md](GLOSSARY.md). Jangan menciptakan sinonim baru di tengah jalan.

## 2. Jangan Berasumsi

2.1. Jika ada requirement, keputusan bisnis, atau detail teknis yang **ambigu, tidak jelas, atau punya banyak kemungkinan interpretasi**, Claude **wajib bertanya ke User dulu** sebelum mengimplementasikan — jangan menebak "yang penting jalan dulu".

2.2. Ini berlaku terutama untuk hal yang **mahal untuk dibalik** (menyangkut uang/pembayaran, struktur data yang sudah dipakai fitur lain, keputusan yang mengubah UX Pembeli secara fundamental). Untuk hal kecil, reversibel, dan berisiko rendah, Claude boleh mengambil keputusan wajar sendiri lalu memberi tahu alasannya secara singkat.

2.3. Pertanyaan klarifikasi harus **spesifik dan disertai opsi konkret** (bukan pertanyaan terbuka yang membebani User untuk merancang sendiri) — pakai tool tanya yang menyediakan pilihan bila memungkinkan.

## 3. Ground Truth adalah Satu-satunya Sumber Kebenaran

3.1. Folder [docs/](.) + [CLAUDE.md](../CLAUDE.md) adalah **satu-satunya sumber kebenaran** (source of truth) untuk arsitektur, spesifikasi, dan aturan proyek ini — bukan asumsi dari chat sebelumnya yang tidak tercatat.

3.2. **Sebelum** mengerjakan fitur baru atau perubahan yang cukup besar, baca dulu dokumen ground truth yang relevan (minimal: [PRD.md](PRD.md), [DATA-MODEL.md](DATA-MODEL.md), [ARSITEKTUR-SISTEM.md](ARSITEKTUR-SISTEM.md)).

3.3. **Setelah** ada perubahan pada fitur, alur bisnis, arsitektur, atau data model — dokumen ground truth terkait **wajib** diperbarui di commit/PR yang sama, **dan** dicatat ringkas di [CHANGELOG.md](../CHANGELOG.md) (lihat format di [DOKUMENTASI.md](DOKUMENTASI.md)). Kode dan dokumentasi **tidak boleh** out of sync.

3.4. Perubahan ground truth yang **signifikan** (mengubah model bisnis, data model inti, atau arsitektur besar) harus **dikonfirmasi ke User terlebih dahulu**, tidak langsung dieksekusi sepihak walau terlihat "jelas lebih baik".

## 4. Prioritas Desain

4.1. **Sederhana dulu (KISS)** — skala target aplikasi ini kecil (pedagang kaki lima), bukan sistem enterprise. Hindari over-engineering, abstraksi prematur, atau fitur yang belum ada kebutuhannya.

4.2. **Cepat & ringan** adalah prioritas teknis eksplisit — terutama untuk halaman Pembeli, yang diakses lewat scan QR di lokasi dengan kemungkinan koneksi data lambat, dari HP yang beragam spesifikasinya. Lihat aturan performa di [BEST-PRACTICES.md](BEST-PRACTICES.md#performa).

4.3. Pembeli **tidak** butuh akun/login. Identifikasi Pembeli cukup lewat field **Nama** per Pesanan — jangan menambah friksi (email, nomor HP wajib, OTP, dsb) tanpa alasan kuat & tanpa disetujui User.

## 5. Alur Kerja Fitur

5.1. Fitur baru (di luar bugfix kecil) harus tercatat dulu di [BACKLOG.md](BACKLOG.md) sebelum dikerjakan — supaya prioritas dan scope jelas.

5.2. Untuk fitur besar/berdampak luas, gunakan **Plan mode** (atau agent `Plan`) untuk menyelaraskan pendekatan dengan User sebelum mulai menulis kode.

5.3. Setelah kode selesai untuk fitur yang menyentuh **pembayaran, autentikasi, atau webhook**, jalankan skill `/security-review` sebelum dianggap selesai (lihat [CLAUDE-SKILLS.md](CLAUDE-SKILLS.md)).

## 6. Uang & Konfigurasi Bisnis

6.1. Setiap angka yang berkaitan dengan **uang** (Biaya Layanan, biaya payment gateway, dsb) harus **dapat dikonfigurasi** (bukan hardcode), dan perubahan defaultnya harus eksplisit disetujui User — lihat [PRD.md](PRD.md#aturan-bisnis).

6.2. Perubahan nilai konfigurasi bisnis pada data production **tidak boleh mengubah histori** — nilai yang dipakai saat sebuah Pesanan terjadi harus disimpan sebagai snapshot di Pesanan itu sendiri (lihat [DATA-MODEL.md](DATA-MODEL.md)).

## 7. Keamanan

7.1. Jangan pernah menaruh API key/credential asli di kode, commit, atau dokumen — selalu lewat environment variable (`.env`, tidak di-commit).

7.2. Semua endpoint webhook (payment gateway) wajib memverifikasi signature/keaslian request sebelum memproses — meskipun di tahap simulasi (`MockPaymentProvider`), tulis kode dengan asumsi nanti akan diganti provider asli yang perlu verifikasi ini (lihat [ARSITEKTUR-SISTEM.md](ARSITEKTUR-SISTEM.md)).

7.3. Data antar Lapak harus terisolasi (satu Pedagang tidak boleh bisa mengakses data/pesanan Pedagang lain) — diterapkan lewat Row Level Security, lihat [ARSITEKTUR-SISTEM.md](ARSITEKTUR-SISTEM.md#keamanan-multi-tenant).

## 8. Kualitas Kerja Claude

8.1. Jangan menandai task selesai tanpa benar-benar memverifikasi (jalankan build/test, atau untuk perubahan UI: coba jalankan aplikasinya seperti diarahkan skill `run`).

8.2. Kalau ragu apakah sesuatu sudah tercakup ground truth atau belum, **cek dulu dokumennya**, jangan menebak isinya dari ingatan sesi sebelumnya (ground truth bisa saja sudah berubah di sesi lain).

8.3. Setiap kali User memberi koreksi atau menyetujui pendekatan yang tidak baku, pertimbangkan apakah itu layak dicatat sebagai memori (preferensi kerja jangka panjang) — di luar ground truth proyek ini.
