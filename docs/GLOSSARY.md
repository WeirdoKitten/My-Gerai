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
| **QRIS Dinamis** | QR pembayaran unik per Pesanan dengan nominal sesuai total belanja, dibuat saat checkout. Dev/test: **disimulasikan** (`MockPaymentProvider`). Staging/produksi (Fase 6): **nyata via Midtrans** Core API (lihat [TEKNOLOGI.md](TEKNOLOGI.md#payment-provider--disbursement-provider-abstraction)). |
| **Payment Provider** | Lapisan abstraksi kode untuk pembayaran. `MockPaymentProvider` (dev/test) \| `MidtransPaymentProvider` (produksi). Dipilih lewat env `PAYMENT_PROVIDER`. |
| **Disbursement Provider** | Lapisan abstraksi kode untuk **Pencairan** otomatis. `MockDisbursementProvider` (dev/test) \| `IrisDisbursementProvider` (Midtrans Iris, produksi). Env `DISBURSEMENT_PROVIDER`. |
| **MDR** (Merchant Discount Rate) | Biaya jasa yang dikenakan penyelenggara pembayaran (Midtrans) ke Aplikator per transaksi QRIS (~0–0,7%). **Ditanggung Aplikator**; **dilarang** dibebankan ke Pembeli. |
| **Biaya Layanan** | Potongan yang dipungut Aplikator dari tiap Pesanan sukses (dari bagian Pedagang). Default Rp1.000, **dapat dikonfigurasi** Admin (lihat [PRD.md](PRD.md#7-aturan-bisnis)). |
| **Saldo Pedagang** | Nilai turunan: jumlah `total_for_merchant` dari Pesanan lunas milik satu Lapak yang **belum** masuk Pencairan mana pun (`orders.payout_id IS NULL`). Bukan kolom tersendiri. |
| **Pencairan (Payout)** | Transfer **Saldo Pedagang** ke rekening/e-wallet Pedagang. Sejak Fase 6: **otomatis** (batch harian via Midtrans Iris), biaya transfer dipotong dari nominal cair (ditanggung Pedagang). Tidak ada pencatatan manual lagi. |
| **Model Agregator** | Model settlement proyek ini: semua pembayaran QRIS masuk ke satu akun Midtrans milik Aplikator, lalu didistribusikan ke Pedagang lewat **Pencairan otomatis** ("Model B"). Alternatif yang **tidak** dipakai: Sub-merchant / Split-Marketplace. |

## Aturan Penamaan Turunan (kode & database)

- Nama tabel/kolom database: `snake_case`, Bahasa Indonesia atau Inggris yang konsisten dengan istilah di atas — lihat keputusan final di [DATA-MODEL.md](DATA-MODEL.md).
- Nama variabel/fungsi/komponen di kode: Inggris (konvensi industri), tapi merujuk konsep yang sama, mis. `Merchant` = Pedagang, `Stall`/`Lapak` = Lapak, `Order` = Pesanan. Pemetaan lengkap ada di [CODING-STYLE.md](CODING-STYLE.md#pemetaan-istilah-domain).
