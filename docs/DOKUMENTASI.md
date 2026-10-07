# Aturan Dokumentasi

## Prinsip

- Dokumen ground truth (`docs/*.md` + `CLAUDE.md`) harus selalu **mencerminkan kondisi nyata proyek** — bukan rencana yang sudah kadaluarsa. Dokumen yang tidak akurat lebih berbahaya daripada tidak ada dokumen sama sekali (menyesatkan sesi Claude berikutnya).
- Ringkas lebih baik daripada lengkap tapi bertele-tele. Kalau sebuah penjelasan sudah ada di dokumen lain, **tautkan** (`[teks](file.md#anchor)`), jangan copy-paste ulang.
- Bahasa Indonesia yang baik dan benar (lihat [RULES.md §1](RULES.md#1-bahasa)).

## Kapan Update Dokumen Apa

| Jenis perubahan | Dokumen yang wajib diperbarui |
|---|---|
| Fitur baru / ubah alur bisnis | [PRD.md](PRD.md) (scope/alur), [BACKLOG.md](BACKLOG.md) (centang/tambah item) |
| Ubah/tambah tabel, kolom, relasi data | [DATA-MODEL.md](DATA-MODEL.md) |
| Ubah keputusan arsitektur (mis. ganti provider, ganti pola integrasi) | [ARSITEKTUR-SISTEM.md](ARSITEKTUR-SISTEM.md) (tambah baris ADR baru) |
| Ubah struktur folder/file nyata | [ARSITEKTUR-FOLDER.md](ARSITEKTUR-FOLDER.md) |
| Ganti/tambah library, tool, atau layanan pihak ketiga | [TEKNOLOGI.md](TEKNOLOGI.md) |
| Ubah token desain (warna/tipografi/spacing), komponen UI baku, atau aturan layout | [DESAIN-SISTEM.md](DESAIN-SISTEM.md) |
| Istilah domain baru | [GLOSSARY.md](GLOSSARY.md) |
| Perubahan signifikan apa pun di atas | **[CHANGELOG.md](../CHANGELOG.md)** (selalu) |

## Aturan Lintas Repo (Aplikasi Android)

Sejak 2026-10-07 ada repo kedua, [My-Gerai-Mobile](https://github.com/WeirdoKitten/My-Gerai-Mobile) (aplikasi Android Pedagang), yang memakai dokumen domain repo ini sebagai sumber kebenaran.

- Dokumen domain (PRD, DATA-MODEL, GLOSSARY, kontrak API mobile, keputusan backend) **hanya ada di sini**. Repo mobile merujuk lewat path relatif `../My-Gerai/docs/`, jadi jangan memindah atau mengganti nama file `docs/` tanpa memperbarui rujukannya di repo mobile.
- Ubah kontrak API mobile (tambah/ubah/hapus field atau endpoint) → perbarui dokumen kontrak API, jaga kompatibilitas dengan versi aplikasi lama, dan tambah item penyesuaian di `docs/BACKLOG.md` repo mobile.
- Fitur Pedagang baru di web → catat juga di BACKLOG repo mobile (paritas), walau dikerjakan belakangan.
- Ubah token desain (warna/tipografi) → beri tahu repo mobile (`docs/DESAIN-SISTEM.md` dan `src/theme.ts` di sana).
- Ubah format struk (`src/lib/utils/receipt.ts`) → encoder struk di repo mobile wajib ikut diubah agar identik.

## Format Entri CHANGELOG.md

Tiap entri:

```
## YYYY-MM-DD — Judul singkat perubahan

**Dampak:** [nama dokumen yang berubah, dipisah koma]
**Alasan:** [kenapa perubahan ini terjadi — keputusan bisnis? temuan teknis? koreksi User?]
**Ringkasan:** [1-3 kalimat inti perubahan]
```

Urutan: entri terbaru di paling atas (setelah judul & pengantar file).

## Siapa yang Menjaga Ini

- **Claude** bertanggung jawab mengusulkan & menulis update dokumen setiap kali mengerjakan task yang berdampak ke ground truth — tidak menunggu diminta eksplisit oleh User untuk hal yang jelas berdampak (lihat [RULES.md §3.3](RULES.md#3-ground-truth-adalah-satu-satunya-sumber-kebenaran)).
- Perubahan **signifikan** (arsitektur besar, model bisnis, data model inti) tetap harus dikonfirmasi User dulu sebelum ditulis (lihat [RULES.md §3.4](RULES.md#3-ground-truth-adalah-satu-satunya-sumber-kebenaran)) — bukan berarti Claude bebas mengubah sendiri.
- User bisa memicu review ground truth kapan saja dengan memberi tahu "cek apakah ground truth masih sesuai" — Claude lalu membandingkan isi `docs/` dengan kondisi kode nyata dan melaporkan ketidaksesuaian.

## Menjaga Dokumen Tidak Membengkak

- Sebelum menambah dokumen baru di `docs/`, cek dulu apakah isinya cocok masuk ke dokumen yang sudah ada.
- Kalau sebuah dokumen sudah terlalu panjang & sulit dipindai, pertimbangkan memecahnya — tapi diskusikan dulu dengan User (perubahan struktur dokumen ground truth juga perlu dicatat di CHANGELOG).
