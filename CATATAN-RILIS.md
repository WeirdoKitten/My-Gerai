# Catatan Rilis MyGerai

Ringkasan pembaruan MyGerai dalam bahasa sehari-hari: apa yang bisa dilakukan **Pembeli**, **Pedagang**, dan **Admin** di setiap pembaruan. Pembaruan terbaru ada di paling atas.

> Catatan teknis lengkap untuk tim pengembang ada di [CHANGELOG.md](CHANGELOG.md).

**Sekilas tentang MyGerai:** aplikasi pemesanan untuk pedagang kecil (bakso, batagor, nasi goreng, dan sebagainya). Pembeli cukup scan QR di lapak, pilih menu, bayar pakai QRIS, dan pesanan langsung masuk ke HP pedagang. Pembeli tidak perlu daftar akun, cukup isi nama.

---

## 30 September 2026: Pilih varian lebih rapi

**Untuk Pembeli**
- Menu yang punya pilihan (misalnya level pedas atau ukuran) sekarang dipilih lewat jendela kecil (popup) setelah menekan "Tambah". Tampilan daftar menu jadi lebih bersih.
- Tombol tambah/kurang jumlah tetap ada langsung di kartu menu, dan jumlahnya ikut terbawa ke popup.

**Untuk Pedagang**
- Label "n varian" di daftar menu dashboard dihilangkan supaya tampilan lebih ringkas.
- Tagihan Biaya Layanan mingguan (untuk lapak yang memakai QRIS pribadi) sekarang ditagih dengan benar, termasuk minggu yang sempat terlewat.

**Perbaikan tampilan**
- Semua teks di aplikasi dirapikan agar lebih mudah dibaca.
- Pilihan "Diantar" di halaman pembayaran diganti namanya jadi "Diantar Kurir".
- Perkiraan waktu antar dihapus karena dirasa tidak diperlukan.

---

## 28–29 September 2026: Pesanan bisa diantar

**Untuk Pembeli**
- Saat pesan, Pembeli bisa memilih **Ambil Sendiri** atau **Diantar** (kalau lapaknya menyediakan layanan antar).
- Kalau pilih Diantar, Pembeli mengisi nomor HP, alamat, patokan, dan menandai lokasi di peta. Ongkos kirim langsung terlihat sebelum bayar.
- Setiap pesanan punya **Kode Pesanan** 8 karakter. Kode ini bisa disalin dan dipakai untuk **melacak pesanan** di halaman Lacak Pesanan, misalnya kalau riwayat browser terhapus.
- Halaman status pesanan menunjukkan kalau pesanan sedang diantar atau gagal diantar.

**Untuk Pedagang**
- Pedagang bisa mengaktifkan layanan antar, menentukan ongkos kirim tetap, dan jarak maksimal pengantaran.
- Di kartu pesanan tersedia tombol buka Google Maps dan chat WhatsApp ke Pembeli.
- Alur pesanan antar: **Mulai Antar**, lalu **Tandai Sudah Diterima**. Kalau Pembeli tidak bisa dihubungi, pedagang bisa menandai **Gagal Diantar** beserta alasannya.
- Ongkos kirim 100% untuk pedagang dan ikut tercatat di Laporan Penjualan.

---

## 25 September 2026: Cetak struk

**Untuk Pedagang**
- Tombol **Lihat Struk** di setiap pesanan yang sudah lunas. Struk bisa dilihat di layar atau dicetak ke printer thermal Bluetooth mini (ukuran kertas 58 mm).
- Struk berisi nama dan alamat lapak, nomor pesanan, nama Pembeli, daftar menu, dan total bayar.
- Catatan: cetak struk hanya bisa lewat browser Chrome dan printer Bluetooth jenis BLE.

---

## 21–22 September 2026: Halaman depan baru dan daftar semua gerai

**Untuk Pembeli**
- Halaman depan MyGerai didesain ulang agar lebih jelas dan ringan dibuka.
- Halaman baru **Semua Gerai** untuk melihat seluruh lapak yang terdaftar. Bisa **cari berdasarkan nama gerai**, dan tampil per halaman supaya tidak berat.
- Setiap kartu gerai menampilkan status **Buka** atau **Tutup**, serta foto sampul lapak.
- Filter lapak berdasarkan area, plus tombol **Terdekat** untuk mengurutkan lapak dari yang paling dekat (hanya meminta izin lokasi kalau tombolnya ditekan).
- Di halaman menu, ada **alamat lapak** dan tombol **Buka di Peta** agar Pembeli mudah menemukan lokasi saat mengambil pesanan.

**Untuk Pedagang**
- Pedagang bisa mengunggah **foto sampul lapak**.
- Alamat lapak terisi otomatis dari titik lokasi di peta, dan tetap bisa diubah manual.
- Suara notifikasi pesanan masuk diganti dengan bunyi yang lebih nyaring dan mudah dikenali.

---

## 16–17 September 2026: Varian menu, area, dan panduan pedagang baru

**Untuk Pembeli**
- Menu bisa punya **varian**, misalnya level pedas, ukuran, atau warna. Harga menyesuaikan pilihan.

**Untuk Pedagang**
- Pedagang bisa menambahkan varian beserta tambahan harganya untuk setiap menu.
- Pedagang bisa menandai **lokasi lapak di peta**.
- Setelah mendaftar, pedagang diarahkan ke halaman **status pendaftaran**, jadi tahu kalau pendaftaran sedang ditinjau Admin.
- Setelah disetujui, pedagang dipandu menambahkan menu pertama sebelum bisa memakai fitur lain, supaya lapak langsung siap dipakai Pembeli.
- Daftar pesanan aktif dibatasi 100 pesanan terlama agar HP tidak berat kalau pesanan menumpuk.

**Untuk Admin**
- Admin bisa membuat **Area** (misalnya "Baleendah") di peta. Lapak otomatis dikelompokkan ke area terdekat.

---

## 14–15 September 2026: Buka/tutup lapak, jadwal, dan keuntungan

**Untuk Pembeli**
- Kalau lapak sedang tutup, muncul pemberitahuan beserta jam buka berikutnya. Menu tetap bisa dilihat, tapi belum bisa dipesan.

**Untuk Pedagang**
- Tombol **Buka/Tutup Lapak** di halaman utama dashboard, dengan warna hijau (buka) atau merah (tutup).
- **Jadwal operasional** per hari, sehingga lapak otomatis buka dan tutup sesuai jam.
- Kolom **Harga Modal** untuk setiap menu (opsional, tidak terlihat oleh Pembeli). Laporan Penjualan jadi bisa menghitung **keuntungan**.
- **Bunyi notifikasi** setiap ada pesanan baru masuk. Bisa dinyalakan atau dimatikan di halaman Profil.

---

## 11 September 2026: Pilihan pakai QRIS pribadi

**Untuk Pedagang**
- Pedagang bisa memakai **QRIS milik sendiri**. Pembeli membayar langsung ke QRIS pedagang, lalu pedagang menandai pesanan sebagai lunas.
- Biaya Layanan untuk lapak QRIS pribadi ditagih **seminggu sekali**. Kalau tagihan belum dibayar sampai batas waktu, lapak sementara tidak bisa menerima pesanan baru.

**Untuk Admin**
- Admin yang mengaktifkan mode QRIS pribadi untuk tiap lapak, setelah memeriksa foto QRIS yang diunggah pedagang.
- Halaman untuk memantau tagihan Biaya Layanan semua lapak.

---

## 8–9 September 2026: Foto menu, stok, riwayat, dan laporan

**Untuk Pembeli**
- Menu tampil dengan **foto**.
- Muncul notifikasi kecil setiap menambahkan menu ke keranjang.
- Rincian pembayaran lebih jelas: **Subtotal + Biaya Layanan = Total**. Biaya Layanan Rp1.000 per transaksi dibayar Pembeli, sehingga pedagang menerima harga menu secara penuh.

**Untuk Pedagang**
- Pedagang bisa **mengunggah foto menu** langsung dari HP.
- **Stok menu** (opsional). Menu yang stoknya habis otomatis disembunyikan dari Pembeli.
- Halaman **Profil** untuk mengubah nama lapak, nama pemilik, kategori, dan rekening pencairan.
- Menu navigasi di bagian bawah layar seperti aplikasi HP: **Pesanan, Item, Riwayat, Laporan**.
- **Riwayat Pesanan** untuk melihat pesanan yang sudah selesai.
- **Laporan Penjualan** (hari ini, 7 hari, 30 hari) lengkap dengan **Asisten Rekomendasi**, contohnya pengingat stok, jam paling ramai, dan menu yang sering dibeli bersamaan.
- **QR Menu** bisa diunduh, dan link menunya bisa disalin untuk dibagikan.
- Muncul konfirmasi sebelum keluar dari dashboard, agar tidak keluar tanpa sengaja.

**Sedang disiapkan**
- Pembayaran QRIS asli lewat Midtrans dan pencairan dana otomatis ke rekening pedagang. Saat ini masih tahap uji coba dan **belum aktif**.

---

## 5–7 September 2026: Versi pertama

**Untuk Pembeli**
- Scan QR lapak, lihat menu, masukkan ke keranjang, isi nama, lalu bayar dengan QRIS.
- Halaman status pesanan yang terus diperbarui: menunggu pembayaran, dibayar, diproses, siap diambil, dan selesai.
- Pesanan yang tidak dibayar dalam batas waktu otomatis kedaluwarsa.

**Untuk Pedagang**
- Daftar lapak sendiri, lalu menunggu persetujuan Admin.
- Kelola menu (tambah, ubah, aktifkan atau matikan).
- Menerima pesanan masuk secara langsung dan mengubah statusnya.
- Unduh QR lapak untuk dicetak dan dipajang.

**Untuk Admin**
- Menyetujui atau menolak pendaftaran pedagang (penolakan wajib disertai alasan).
- Mengatur besar Biaya Layanan.
- Melihat saldo setiap pedagang dan mencatat pencairan dana.

**Tampilan dan keamanan**
- Tampilan seluruh aplikasi dirancang ulang dengan warna hangat dan huruf yang mudah dibaca di HP.
- Perlindungan dari percobaan login berulang dan pengujian otomatis untuk alur pemesanan.
