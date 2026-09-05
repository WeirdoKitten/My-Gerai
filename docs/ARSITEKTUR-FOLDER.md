# Arsitektur Folder

> Struktur ini adalah **target** struktur folder. Setelah Fase 1-4 ([BACKLOG.md](BACKLOG.md)): `src/lib/db/{schema.ts,client.ts,seed.ts}`, `drizzle.config.ts`, `drizzle/` (migrasi), route group `(buyer)`, `(merchant)` & `(admin)` lengkap, `components/{buyer,merchant,admin}/`, `server/{orders,products,merchants,admins,config,payouts}.ts`, `lib/{payment,validation,utils,cart,auth}/`, `types/` **sudah nyata ada**. Folder `lib/cart/` dan `lib/auth/` **tidak** ada di rencana awal — ditambahkan saat implementasi (keranjang sisi klien di Fase 2; hash password & sesi login di Fase 3, lihat [TEKNOLOGI.md §Autentikasi](TEKNOLOGI.md#autentikasi)). `docker-compose.dev.yml` (Postgres dev lokal) & `Dockerfile`+`.dockerignore` (image produksi untuk Dokploy) di root juga baru. `server/config.ts` & `server/payouts.ts` (Fase 4) juga tidak persis seperti rencana awal — `admins.ts` dan `payouts.ts` **tidak** ada di target semula, ditambahkan karena approve/reject Pedagang & login Admin ternyata cukup besar untuk file sendiri (bukan digabung ke `merchants.ts`/`config.ts`). Halaman Admin juga punya route group bersarang `(dashboard)` yang tidak direncanakan semula — dipakai supaya `merchants/`, `config/`, `payouts/` berbagi guard sesi + header lewat satu layout, tanpa ikut membungkus `admin/login`. Sisanya (`components/ui`, `lib/realtime/`, `api/webhooks/payment/`, `lib/payment/tripay-provider.ts`, `tests/`) masih target, dibuat bertahap di fase-fase berikutnya (realtime & payment nyata = Fase 6, tests = Fase 5). Kalau struktur ini berubah signifikan setelah scaffolding nyata, dokumen ini **wajib** diperbarui (lihat [RULES.md §3](RULES.md#3-ground-truth-adalah-satu-satunya-sumber-kebenaran)).

```
/
├── CLAUDE.md                  # Instruksi utama untuk Claude Code (selalu dibaca tiap sesi)
├── README.md                  # Pengantar proyek untuk manusia
├── CHANGELOG.md               # Riwayat perubahan ground truth & fitur besar
├── docs/                      # Ground truth (dokumen ini)
│   ├── RULES.md
│   ├── PRD.md
│   ├── ARSITEKTUR-SISTEM.md
│   ├── ARSITEKTUR-FOLDER.md   # (dokumen ini)
│   ├── TEKNOLOGI.md
│   ├── DATA-MODEL.md
│   ├── BACKLOG.md
│   ├── BEST-PRACTICES.md
│   ├── CODING-STYLE.md
│   ├── DOKUMENTASI.md
│   ├── CLAUDE-SKILLS.md
│   ├── PROMPT-TIPS.md
│   └── GLOSSARY.md
├── src/
│   ├── app/
│   │   ├── (buyer)/
│   │   │   ├── menu/[stallSlug]/page.tsx      # Katalog Item sebuah Lapak
│   │   │   ├── checkout/page.tsx              # Form Nama + ringkasan Keranjang
│   │   │   └── pesanan/[orderId]/page.tsx     # Status Pesanan + QR pembayaran
│   │   ├── (merchant)/
│   │   │   ├── login/page.tsx
│   │   │   ├── daftar/page.tsx                # Onboarding Pedagang baru
│   │   │   └── dashboard/
│   │   │       ├── page.tsx                   # Daftar Pesanan masuk (realtime)
│   │   │       └── produk/page.tsx            # Kelola Item
│   │   ├── (admin)/
│   │   │   └── admin/
│   │   │       ├── login/page.tsx             # DI LUAR (dashboard) — self-redirect kalau sudah login
│   │   │       └── (dashboard)/               # Route group bersarang: guard sesi + header, tidak ubah URL
│   │   │           ├── layout.tsx             # getAdminSession() -> redirect /admin/login kalau null
│   │   │           ├── merchants/page.tsx     # Approve/reject Pedagang (+ alasan saat reject)
│   │   │           ├── config/page.tsx        # Atur Biaya Layanan & durasi kedaluwarsa + histori
│   │   │           └── payouts/page.tsx       # Saldo Pedagang, Daftar Transaksi, catat Pencairan manual
│   │   └── api/
│   │       └── webhooks/payment/route.ts      # (target Fase 6) Endpoint webhook saat provider nyata aktif
│   ├── components/
│   │   ├── ui/                                # (target) Komponen primitif (button, dialog, dst — shadcn-style)
│   │   ├── buyer/
│   │   ├── merchant/
│   │   └── admin/                             # LoginAdminForm, MerchantApprovalList/Row, PlatformConfigForm/History, PayoutsManager, dst
│   ├── server/                                # Server Actions, dikelompokkan per domain bisnis (bukan per peran)
│   │   ├── orders.ts
│   │   ├── products.ts
│   │   ├── merchants.ts                       # + listMerchantsForAdmin/approveMerchant/rejectMerchant (Fase 4)
│   │   ├── admins.ts                          # loginAdmin/logoutAdmin (Fase 4, tidak ada di rencana awal)
│   │   ├── config.ts                          # getActivePlatformConfig (dipakai bareng alur Pembeli) + update & histori (Admin)
│   │   └── payouts.ts                         # Saldo Pedagang, catat Pencairan (Fase 4, tidak ada di rencana awal)
│   ├── lib/
│   │   ├── db/                                # Drizzle schema & client
│   │   │   ├── schema.ts
│   │   │   ├── client.ts
│   │   │   └── seed.ts                        # Data contoh untuk dev lokal (guard: hanya boleh ke localhost)
│   │   ├── payment/                           # Payment Provider abstraction
│   │   │   ├── types.ts                       # interface PaymentProvider
│   │   │   ├── mock-provider.ts
│   │   │   └── tripay-provider.ts             # (target Fase 6)
│   │   ├── cart/                              # Keranjang sisi klien (Context + localStorage)
│   │   ├── auth/                              # Hash password (scrypt) & sesi login: session.ts (Pedagang), admin-session.ts (Admin, Fase 4)
│   │   ├── realtime/                          # (target) belum dipakai — status Pesanan/dashboard masih polling langsung di komponen
│   │   ├── validation/                        # Skema Zod
│   │   └── utils/
│   └── types/                                 # Tipe TypeScript bersama
├── drizzle/                                   # File migrasi database
├── docker-compose.dev.yml                     # Postgres LOKAL untuk dev — bukan produksi
├── Dockerfile                                 # Image produksi untuk deploy via Dokploy (server Garuda)
├── .dockerignore
├── tests/                                     # (target Fase 5) unit test & e2e formal
│   ├── unit/
│   └── e2e/
└── public/
```

## Konvensi Penamaan

- **Route group** `(buyer)`, `(merchant)`, `(admin)` dipakai agar layout berbeda per peran tanpa mengubah URL publik. Guard auth ditegakkan lewat Server Component layout (`dashboard/layout.tsx` untuk Pedagang, `admin/(dashboard)/layout.tsx` untuk Admin) yang memanggil `getMerchantSession()`/`getAdminSession()` dan redirect kalau tidak valid — **bukan** lewat `proxy.ts` (pengganti `middleware.ts` di Next.js 16), sesuai rekomendasi dokumentasi Next.js untuk memverifikasi auth di dalam Server Function/Component, bukan hanya mengandalkan Proxy.
- File Server Action dikelompokkan **per domain bisnis** (bukan per jenis operasi), supaya semua logika terkait "orders" (Pesanan) ada di satu tempat — memudahkan menelusuri dampak perubahan aturan bisnis Pesanan.
- Semua yang berhubungan dengan pembayaran **wajib** lewat `lib/payment/` — jangan panggil provider tertentu langsung dari `server/orders.ts` (harus lewat interface `PaymentProvider`), supaya sesuai prinsip di [TEKNOLOGI.md](TEKNOLOGI.md#payment-provider-abstraction).
- Komponen dipisah per peran (`components/buyer`, `components/merchant`, `components/admin`) — hanya komponen benar-benar generik yang masuk `components/ui`.
