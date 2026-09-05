# Tips Prompt — Supaya Claude Bekerja Maksimal di Proyek Ini

> Ditulis untuk User yang masih pemula di ranah pengembangan software. Tidak perlu dihafal — cukup jadi acuan kalau bingung mau mulai prompt dari mana.

## Prinsip Umum

1. **Rujuk dokumen, bukan cuma jelaskan ulang.** Karena ground truth di `docs/` sudah lengkap, cukup bilang "sesuai BACKLOG.md fase 3, kerjakan X" daripada menjelaskan ulang seluruh konteks dari nol tiap chat baru.
2. **Satu topik besar per sesi/prompt.** Kalau mau minta 3 fitur berbeda, lebih baik dipisah jadi 3 permintaan berurutan (atau minta Claude buat rencana dulu untuk semuanya, baru dieksekusi satu-satu).
3. **Kalau ragu, bilang "tanya dulu kalau ada yang tidak jelas"** — walau ini sudah jadi rule tetap di [RULES.md](RULES.md), mengingatkan tidak pernah rugi terutama untuk keputusan yang menyangkut uang/data.
4. **Kasih contoh konkret** kalau menjelaskan perilaku yang diinginkan, mis. "kalau Item habis, tombolnya harus abu-abu dan tulisannya 'Habis'" lebih jelas daripada "tampilkan kalau habis".
5. **Koreksi kecil-kecil itu bagus**, bukan mengganggu — kalau ada yang kurang pas, langsung bilang saat itu juga daripada dipendam sampai banyak. Ini juga yang membuat Claude belajar preferensi Anda lewat memori.

## Format yang Membantu (opsional, tidak wajib)

Untuk fitur baru, format ala user story bisa membantu:

> Sebagai **[Pembeli/Pedagang/Admin]**, saya ingin **[melakukan apa]**, supaya **[tujuannya apa]**.

Contoh: *"Sebagai Pedagang, saya ingin melihat notifikasi suara saat ada Pesanan baru, supaya saya tidak perlu terus-terusan melihat layar HP."*

## Contoh Prompt Baik vs Kurang Baik

| Kurang baik | Lebih baik |
|---|---|
| "Bikin halaman menu" | "Bikin halaman katalog Lapak (`/menu/[stallSlug]`) sesuai [ARSITEKTUR-FOLDER.md](ARSITEKTUR-FOLDER.md), ambil data Item dari Supabase, tampilkan yang `status=available` saja" |
| "Kok lambat ya" | "Halaman checkout kerasa lambat pas buka pertama kali di HP saya (Android, koneksi 4G biasa) — tolong cek apakah ada yang bisa dioptimasi sesuai [BEST-PRACTICES.md §Performa](BEST-PRACTICES.md#performa)" |
| "Tambahin fitur diskon" | "Saya mau tambah fitur diskon per Item. Sebelum dikerjakan, tolong ajukan pertanyaan kalau ada yang belum jelas (misal: diskon nominal atau persen? berlaku per Item atau per Pesanan?) baru bikin rencananya" |

## Melanjutkan Kerja di Chat/Room Baru

Karena [CLAUDE.md](../CLAUDE.md) otomatis dibaca tiap sesi, Anda **tidak perlu mengulang konteks proyek dari nol**. Cukup:

- Untuk melanjutkan task yang jelas: "lanjutkan sesuai BACKLOG.md, kerjakan fase 2 bagian checkout".
- Untuk cek status: "cek BACKLOG.md, apa saja yang sudah selesai dan yang belum".
- Kalau curiga ground truth sudah tidak sinkron dengan kode: "cek apakah docs/ masih sesuai dengan kode sekarang, laporkan kalau ada yang beda".

## Kapan Minta Rencana Dulu (Plan Mode)

Minta Claude masuk Plan mode (atau eksplisit bilang "buat rencana dulu, jangan langsung ngoding") untuk:

- Fitur yang menyentuh banyak dokumen ground truth sekaligus.
- Perubahan ke alur pembayaran atau data model inti.
- Kalau Anda sendiri belum yakin dengan detail fiturnya — biar Claude bantu memetakan opsi & trade-off dulu.

Untuk bugfix kecil atau task yang jelas & terisolasi, tidak perlu Plan mode — langsung minta kerjakan lebih efisien.

## Review Sebelum "Selesai"

Kalau Claude bilang sebuah fitur selesai, boleh ditanya balik: "sudah dicoba jalanin di browser?" atau "sudah lewat `/code-review`?" — terutama untuk fitur yang menyentuh uang. Ini konsisten dengan [CLAUDE-SKILLS.md](CLAUDE-SKILLS.md).
