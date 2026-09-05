# Glosarium Istilah

> Dokumen ini adalah kamus istilah resmi proyek **MyGerai**. Semua dokumen ground truth, kode, dan komunikasi (baik antara Claude ↔ User maupun dalam UI aplikasi) **wajib** memakai istilah dari daftar ini agar konsisten. Jangan menciptakan sinonim baru (mis. jangan campur "Toko", "Warung", "Lapak" untuk konsep yang sama — pakai "Lapak").

| Istilah | Definisi |
|---|---|
| **MyGerai** | Nama kerja proyek ini (diambil dari nama folder). Bisa berubah — lihat [PRD.md](PRD.md#nama-produk). |
| **Aplikator** | Pihak pengelola platform MyGerai (pemilik bisnis, dalam hal ini User). Aplikator memungut **Biaya Layanan** dari tiap pesanan sukses. |
| **Admin** | Akun pengelola internal Aplikator. Bertugas approve Pedagang baru, atur konfigurasi (termasuk Biaya Layanan), dan memantau transaksi/pencairan. |
| **Pedagang** | Pemilik usaha kecil (tukang bakso, batagor, cakue, penjual baju, dll) yang berjualan lewat MyGerai. Setara "merchant"/"seller". |
| **Lapak** | Unit usaha milik satu Pedagang di dalam sistem — punya nama, kategori, dan satu QR unik sendiri. Asumsi MVP: **1 Pedagang = 1 Lapak**. |
| **Pembeli** | Orang yang memindai QR dan memesan. **Tidak punya akun/login** — hanya mengisi **Nama Pembeli** saat checkout. |
| **Item** | Barang/menu yang dijual sebuah Lapak (istilah netral, mencakup makanan maupun non-makanan seperti baju). Setara "produk". |
| **Keranjang** | Kumpulan Item yang dipilih Pembeli sebelum checkout. Tersimpan sementara di sisi browser Pembeli (belum jadi Pesanan resmi). |
| **Pesanan** | Transaksi resmi yang tercipta saat Pembeli checkout. Setara "order". Punya **Kode Pesanan** dan **Status Pesanan**. |
| **Kode Pesanan** | Kode pendek unik (mis. `B231`) yang ditampilkan ke Pembeli untuk ditunjukkan/disebutkan ke Pedagang saat mengambil Pesanan. |
| **Status Pesanan** | Salah satu dari: `menunggu_pembayaran`, `dibayar`, `diproses`, `siap_diambil`, `selesai`, `dibatalkan`, `kedaluwarsa`. Detail lihat [DATA-MODEL.md](DATA-MODEL.md). |
| **QR Lapak** | QR statis permanen milik satu Lapak, mengarah ke halaman katalog Lapak tsb. Dicetak/ditempel Pedagang di gerobak/lapaknya. |
| **QRIS Dinamis** | QR pembayaran unik per Pesanan dengan nominal sesuai total belanja, dibuat saat checkout. Pada tahap MVP ini **disimulasikan** (lihat [TEKNOLOGI.md](TEKNOLOGI.md#payment-provider-abstraction)). |
| **Payment Provider** | Lapisan abstraksi kode untuk pembayaran. Implementasi awal: `MockPaymentProvider` (simulasi). Implementasi lanjutan: `TripayPaymentProvider` (nyata). |
| **Biaya Layanan** | Potongan yang dipungut Aplikator dari tiap Pesanan sukses. Default Rp1.000, **dapat dikonfigurasi** Admin (lihat [PRD.md](PRD.md#aturan-bisnis)). |
| **Saldo Pedagang** | Catatan akumulasi (ledger) uang yang menjadi hak seorang Pedagang setelah dikurangi Biaya Layanan, menunggu **Pencairan**. |
| **Pencairan (Payout)** | Proses Aplikator mentransfer **Saldo Pedagang** ke rekening/e-wallet Pedagang. MVP: dilakukan **manual** oleh Admin. |
| **Model Agregator** | Model settlement yang dipakai proyek ini: semua pembayaran QRIS masuk ke satu akun milik Aplikator, lalu didistribusikan ke Pedagang lewat Pencairan. (Alternatif yang **tidak** dipakai: model Sub-merchant.) |

## Aturan Penamaan Turunan (kode & database)

- Nama tabel/kolom database: `snake_case`, Bahasa Indonesia atau Inggris yang konsisten dengan istilah di atas — lihat keputusan final di [DATA-MODEL.md](DATA-MODEL.md).
- Nama variabel/fungsi/komponen di kode: Inggris (konvensi industri), tapi merujuk konsep yang sama, mis. `Merchant` = Pedagang, `Stall`/`Lapak` = Lapak, `Order` = Pesanan. Pemetaan lengkap ada di [CODING-STYLE.md](CODING-STYLE.md#pemetaan-istilah-domain).
