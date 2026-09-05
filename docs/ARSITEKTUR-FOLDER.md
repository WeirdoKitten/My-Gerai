# Arsitektur Folder

> Struktur ini adalah **target** untuk saat kode mulai ditulis (belum discaffold — lihat [BACKLOG.md](BACKLOG.md) Fase 1). Kalau struktur ini berubah signifikan setelah scaffolding nyata, dokumen ini **wajib** diperbarui (lihat [RULES.md §3](RULES.md#3-ground-truth-adalah-satu-satunya-sumber-kebenaran)).

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
│   │   │       ├── merchants/page.tsx         # Approve/reject Pedagang
│   │   │       ├── config/page.tsx            # Atur Biaya Layanan, dsb
│   │   │       └── payouts/page.tsx           # Catat Pencairan manual
│   │   └── api/
│   │       └── webhooks/payment/route.ts      # Endpoint webhook (dipakai saat provider nyata aktif)
│   ├── components/
│   │   ├── ui/                                # Komponen primitif (button, dialog, dst — shadcn-style)
│   │   ├── buyer/
│   │   ├── merchant/
│   │   └── admin/
│   ├── server/                                # Server Actions, dikelompokkan per domain
│   │   ├── orders.ts
│   │   ├── products.ts
│   │   ├── merchants.ts
│   │   └── config.ts
│   ├── lib/
│   │   ├── db/                                # Drizzle schema & client
│   │   │   ├── schema.ts
│   │   │   └── client.ts
│   │   ├── payment/                           # Payment Provider abstraction
│   │   │   ├── types.ts                       # interface PaymentProvider
│   │   │   ├── mock-provider.ts
│   │   │   └── tripay-provider.ts             # (fase lanjutan)
│   │   ├── realtime/
│   │   ├── validation/                        # Skema Zod
│   │   └── utils/
│   └── types/                                 # Tipe TypeScript bersama
├── drizzle/                                   # File migrasi database
├── tests/
│   ├── unit/
│   └── e2e/
└── public/
```

## Konvensi Penamaan

- **Route group** `(buyer)`, `(merchant)`, `(admin)` dipakai agar layout & middleware auth berbeda per peran tanpa mengubah URL publik.
- File Server Action dikelompokkan **per domain bisnis** (bukan per jenis operasi), supaya semua logika terkait "orders" (Pesanan) ada di satu tempat — memudahkan menelusuri dampak perubahan aturan bisnis Pesanan.
- Semua yang berhubungan dengan pembayaran **wajib** lewat `lib/payment/` — jangan panggil provider tertentu langsung dari `server/orders.ts` (harus lewat interface `PaymentProvider`), supaya sesuai prinsip di [TEKNOLOGI.md](TEKNOLOGI.md#payment-provider-abstraction).
- Komponen dipisah per peran (`components/buyer`, `components/merchant`, `components/admin`) — hanya komponen benar-benar generik yang masuk `components/ui`.
