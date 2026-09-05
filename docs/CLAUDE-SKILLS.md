# Aturan Pemakaian Skill Claude Code

> Ini panduan **kapan pakai skill/tool bawaan Claude Code apa** untuk proyek ini, supaya kualitas pengembangan konsisten tanpa User perlu mengingatkan tiap kali.

## Wajib Dipakai

- **`/security-review`** — jalankan setiap kali selesai mengerjakan fitur yang menyentuh **pembayaran, autentikasi/login, webhook, atau akses data lintas Pedagang (isolasi multi-tenant level aplikasi)**. Ini area paling berisiko di proyek ini (uang & data multi-tenant) — lihat [RULES.md §5.3](RULES.md#5-alur-kerja-fitur).
- **Plan mode / agent `Plan`** — dipakai untuk fitur besar atau perubahan yang menyentuh banyak file/dokumen ground truth sekaligus, sebelum mulai menulis kode, supaya pendekatan disepakati dulu dengan User.

## Direkomendasikan

- **`/code-review`** — jalankan sebelum menganggap sebuah fitur "selesai", terutama untuk logika perhitungan uang (Biaya Layanan, total Pesanan) — pakai level `high` untuk perubahan biasa, pertimbangkan `ultra` untuk perubahan besar ke alur pembayaran/checkout.
- **`/simplify`** — jalankan setelah fitur berfungsi, untuk membersihkan kode sebelum dianggap final (sesuai prinsip KISS di [RULES.md §4](RULES.md#4-prioritas-desain)).
- **`run` skill** — untuk mencoba aplikasi berjalan nyata di browser sebelum melaporkan perubahan UI selesai (lihat instruksi global soal ini). Penting khususnya untuk halaman Pembeli — coba alur checkout penuh, bukan cuma cek kode-nya benar.
- **`design` skill** — untuk membuat mockup/wireframe halaman baru (terutama halaman Pembeli, yang harus sesederhana & secepat mungkin dipahami) sebelum implementasi sungguhan, supaya User bisa kasih feedback lebih murah/cepat lewat gambar daripada lewat kode jadi.
- **`dataviz` skill** — dipakai nanti saat membangun halaman laporan/analitik untuk Admin atau Pedagang (Fase 6+ di [BACKLOG.md](BACKLOG.md)).
- **Subagent `Explore`** — dipakai untuk pencarian kode lintas file setelah codebase mulai membesar (bukan untuk proyek yang masih sangat kecil, di mana pencarian langsung lebih cepat).

## Alur Kerja yang Disarankan per Task

1. Baca ground truth relevan (lihat [CLAUDE.md](../CLAUDE.md) untuk daftar & kapan baca apa).
2. Untuk fitur besar: Plan mode dulu → selaraskan dengan User.
3. Implementasi.
4. Kalau menyentuh uang/auth/webhook/isolasi data antar Pedagang → `/security-review`.
5. `/code-review` (opsional tapi disarankan) → `/simplify`.
6. Untuk perubahan UI → jalankan aplikasi (`run` skill) & coba manual.
7. Update dokumen ground truth terkait + [CHANGELOG.md](../CHANGELOG.md).
8. Centang item terkait di [BACKLOG.md](BACKLOG.md).

## Task Tracking

Untuk pekerjaan multi-langkah dalam satu sesi, gunakan mekanisme task/todo internal Claude Code (bukan menulis rencana ke file terpisah di luar `docs/`) — jaga agar dokumen perencanaan sementara tidak menumpuk di luar ground truth resmi.

## Skill Bawaan vs Skill/Konfigurasi Custom (`.claude/`)

Dokumen ini **hanya mengatur kapan memakai skill bawaan** yang sudah tersedia (`/security-review`, `/code-review`, `run`, `design`, dst) — bukan tempat mendefinisikan skill baru.

Claude Code juga mendukung tooling **custom** di folder `.claude/` (belum dibuat di proyek ini):

| Folder/file | Fungsi |
|---|---|
| `.claude/skills/<nama>/SKILL.md` | Skill custom project-level (instruksi + file pendukung), bisa auto-trigger via `description` atau dipanggil manual `/nama` |
| `.claude/agents/<nama>.md` | Definisi subagent custom (tools/model/permission sendiri) |
| `.claude/settings.json` | Konfigurasi project: permission default, hooks, dsb (di-commit, dibagi ke semua sesi/anggota) |
| `.claude/settings.local.json` | Override khusus mesin lokal (tidak di-commit) |

**Keputusan untuk MyGerai (dicatat 2026-09-05):** belum membuat isi `.claude/` sekarang karena proyek belum punya kode/workflow konkret untuk dibungkus jadi skill — membuatnya sekarang hanya menghasilkan boilerplate kosong dan melanggar prinsip KISS ([RULES.md §4](RULES.md#4-prioritas-desain)). Rencana:

- **Fase 1 (scaffolding, lihat [BACKLOG.md](BACKLOG.md))**: buat `.claude/settings.json` berisi permission dasar (izinkan command `pnpm`/`git` yang sering dipakai tanpa prompt berulang) — bisa pakai skill `fewer-permission-prompts` atau `update-config` untuk ini.
- **Setelah ada workflow yang benar-benar berulang & konkret** (mis. urutan tetap saat menambah field baru ke Item, atau langkah baku sebelum deploy): baru pertimbangkan buat custom skill di `.claude/skills/`. Jangan dibuat mendahului kebutuhan nyata.
- Kalau nanti dibuat, tambahkan juga rujukannya di dokumen ini (bagian atas) supaya tetap satu tempat rujukan skill apa saja yang tersedia untuk proyek ini.
