import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import dotenv from "dotenv";
import postgres from "postgres";

// EO & event dari src/lib/db/seed.ts. Gerai Titipan baru dibuat lewat UI.
const EO_PHONE = "083333333333";
const EVENT_SLUG = "wisata-kuliner-bandung";
const EVENT_NAME = "Wisata Kuliner Bandung";
const PROXY_NAME = "Toko Uji Titipan";
const ITEM_A = { name: "Dodol Uji", price: "30000", cost: "24000" };
const ITEM_B = { name: "Keripik Uji", price: "20000", cost: "15000" };

const { parsed } = dotenv.config({
  path: path.resolve(__dirname, "../../.env.test"),
});
const sql = postgres(parsed?.DATABASE_URL ?? "");
// CRON_SECRET dibaca server dari .env (bukan .env.test). `parse` saja,
// supaya isi .env (mis. DATABASE_URL dev) tidak masuk ke process.env tes.
function readCronSecret(): string {
  try {
    return (
      dotenv.parse(readFileSync(path.resolve(__dirname, "../../.env")))
        .CRON_SECRET ?? ""
    );
  } catch {
    return "";
  }
}
const CRON_SECRET = readCronSecret();
const QRIS_FIXTURE = path.join(__dirname, "fixtures", "qris.png");

test.afterAll(async () => {
  await sql.end();
});

function newToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: createHash("sha256").update(token).digest("hex") };
}

/**
 * Sesi EO disuntik langsung ke DB (bukan login lewat form) — budget
 * rate-limit login EO per IP sudah dipakai eo-flow.spec.ts di proses server
 * yang sama.
 */
async function eoSessionCookie(phone: string) {
  const { token, hash } = newToken();
  await sql`
    insert into eo_sessions (organizer_id, token_hash, expires_at)
    select id, ${hash}, now() + interval '1 day'
    from event_organizers where phone = ${phone}`;
  return {
    name: "mygerai_eo_session",
    value: token,
    domain: "localhost",
    path: "/",
  };
}

async function openEventAsEo(page: import("@playwright/test").Page) {
  await page.context().addCookies([await eoSessionCookie(EO_PHONE)]);
  await page.goto("/eo");
  await page.getByRole("link", { name: new RegExp(EVENT_NAME) }).click();
  await expect(page).toHaveURL(/\/eo\/event\/[0-9a-f-]+$/);
}

/** Klik "Kelola" pada Gerai Titipan yang dibuat tes ini (seed juga punya satu). */
async function manageProxyStall(page: import("@playwright/test").Page) {
  await page
    .locator("li", { hasText: PROXY_NAME })
    .getByRole("button", { name: "Kelola Item & Pesanan →" })
    .click();
}

test.describe
  .serial("Gerai Titipan", () => {
    let proxySlug: string;
    let orderUrl: string;

    test("EO membuat Gerai Titipan dan mengisi menunya lewat Kelola", async ({
      page,
    }) => {
      await openEventAsEo(page);

      await page.getByRole("button", { name: "Buat Gerai Titipan" }).click();
      await page.getByLabel("Nama Gerai").fill(PROXY_NAME);
      await page.getByLabel("Kategori").fill("Oleh-oleh");
      await page
        .getByRole("button", { name: "Buat & Tambahkan ke Event" })
        .click();
      await expect(
        page.getByText(`Gerai Titipan ${PROXY_NAME} dibuat`),
      ).toBeVisible();

      const [row] = await sql<{ slug: string }[]>`
        select slug from merchants where stall_name = ${PROXY_NAME}`;
      proxySlug = row.slug;

      // "Kelola" membuka dashboard Pedagang milik Gerai Titipan.
      await manageProxyStall(page);
      await expect(page).toHaveURL(/\/dashboard\/produk$/);
      await expect(page.getByRole("link", { name: "Portal EO" })).toBeVisible();
      await expect(page.getByRole("link", { name: "QR Menu" })).toHaveCount(0);

      for (const item of [ITEM_A, ITEM_B]) {
        await page.getByRole("button", { name: "Tambah Item" }).click();
        const form = page.getByRole("dialog", { name: "Tambah Item" });
        await form.getByLabel("Nama Item").fill(item.name);
        await form.getByLabel("Harga Jual (Rp)").fill(item.price);
        await form.getByLabel("Harga Modal (Rp)").fill(item.cost);
        await form.getByRole("button", { name: "Simpan" }).click();
        if (item === ITEM_A) {
          await expect(
            page.getByText(/bisa dipesan peserta lewat QR Event/),
          ).toBeVisible();
          await page.getByRole("button", { name: "Lanjut" }).click();
        }
        await expect(page.getByText(item.name)).toBeVisible();
      }

      // Halaman yang tidak berlaku untuk Gerai Titipan dialihkan.
      await page.goto("/dashboard/qr");
      await expect(page).toHaveURL(/\/dashboard$/);
    });

    test("Gerai Titipan hanya bisa dibuka lewat halaman event", async ({
      page,
    }) => {
      const menu = await page.goto(`/menu/${proxySlug}`);
      expect(menu?.status()).toBe(404);

      await page.goto("/gerai");
      await expect(page.getByText(PROXY_NAME)).toHaveCount(0);
    });

    test("Peserta memesan dari Gerai Titipan dan membayar", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/e/${EVENT_SLUG}`);
      await page.getByRole("link", { name: new RegExp(PROXY_NAME) }).click();
      await expect(
        page.getByText(/Kalau ada Item yang habis, kami ganti/),
      ).toBeVisible();

      const add = page.getByRole("button", { name: "Tambah", exact: true });
      await add.nth(0).click();
      await add.nth(1).click();
      await page.getByRole("link", { name: /item/i }).click();
      await expect(page).toHaveURL(/\/checkout$/);
      await page.getByLabel("Nama").fill("Peserta Titipan");
      await page.getByRole("button", { name: /Buat Pesanan/ }).click();
      await expect(page).toHaveURL(/\/pesanan\/[0-9a-f-]+$/);
      orderUrl = new URL(page.url()).pathname;

      // Dibayar langsung ke QRIS EO: tanpa simulasi gateway, tanpa Biaya Layanan.
      await expect(page.getByText("Menunggu Pembayaran")).toBeVisible();
      await expect(page.getByAltText("QR pembayaran")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Simulasikan Pembayaran Berhasil" }),
      ).toHaveCount(0);
      await expect(page.getByText(/Rp\s?50\.000/).first()).toBeVisible();
    });

    test("EO menandai Item diganti dan tidak tersedia", async ({ page }) => {
      await openEventAsEo(page);
      await manageProxyStall(page);
      await expect(page).toHaveURL(/\/dashboard$/);

      const card = page
        .getByText("Atas nama Peserta Titipan")
        .locator("xpath=ancestor::*[contains(@class,'rounded-card')][1]");
      const itemRow = (name: string) => card.locator("li", { hasText: name });

      // EO memastikan uang masuk ke QRIS-nya, lalu menandai lunas.
      await card.getByRole("button", { name: "Tandai Lunas" }).click();
      await expect(
        card.getByRole("button", { name: "Tandai Diproses" }),
      ).toBeVisible();

      await itemRow(ITEM_A.name)
        .getByRole("button", { name: "Item habis?" })
        .click();
      await page.getByLabel("Nama barang pengganti").fill("Dodol Durian");
      await page.getByRole("button", { name: "Simpan" }).click();
      await expect(
        card.getByText("Diganti dengan: Dodol Durian"),
      ).toBeVisible();

      await itemRow(ITEM_B.name)
        .getByRole("button", { name: "Item habis?" })
        .click();
      await page.getByRole("button", { name: "Tidak tersedia" }).click();
      await page.getByRole("button", { name: "Simpan" }).click();
      await expect(
        card.getByText(/Tidak tersedia · kembalikan Rp\s?20\.000 ke Pembeli/),
      ).toBeVisible();
    });

    test("Pembeli melihat penggantian di halaman Pesanannya", async ({
      page,
    }) => {
      await page.goto(orderUrl);
      await expect(
        page.getByText("Diganti dengan: Dodol Durian"),
      ).toBeVisible();
      await expect(
        page.getByText(
          /Tidak tersedia · Rp\s?20\.000 dikembalikan saat serah terima/,
        ),
      ).toBeVisible();
    });

    test("Ringkasan penjualan EO menghitung uang Gerai Titipan", async ({
      page,
    }) => {
      await openEventAsEo(page);
      const summary = page
        .getByRole("heading", { name: "Ringkasan penjualan" })
        .locator("xpath=..");
      const row = summary
        .getByText(PROXY_NAME, { exact: true })
        .locator("xpath=ancestor::li[1]");
      await expect(row.getByText("1 Pesanan")).toBeVisible();
      // Penjualan 50.000; modal hanya Dodol (24.000); Keripik 20.000 dikembalikan.
      await expect(row.getByText(/Rp\s?50\.000/)).toBeVisible();
      await expect(row.getByText(/Rp\s?24\.000/)).toBeVisible();
      await expect(row.getByText(/Rp\s?20\.000/)).toBeVisible();
      await expect(row.getByText(/Rp\s?6\.000/)).toBeVisible();
    });

    test("Logout EO ikut mencabut sesi Kelola Gerai Titipan", async ({
      page,
    }) => {
      await openEventAsEo(page);
      await manageProxyStall(page);
      await expect(page).toHaveURL(/\/dashboard$/);

      await page.goto("/eo");
      await page.getByRole("button", { name: "Keluar" }).click();
      await page
        .getByRole("dialog", { name: "Yakin Ingin Keluar?" })
        .getByRole("button", { name: "Keluar" })
        .click();
      await expect(page).toHaveURL(/\/eo\/login$/);

      await page.goto("/dashboard");
      await expect(page).toHaveURL(/\/login$/);
    });

    test("Biaya Layanan Gerai Titipan ditagih per EO dan bisa mengunci Gerai", async ({
      page,
      request,
    }) => {
      // Mundurkan waktu lunas Pesanan ke periode yang sudah tutup.
      await sql`
        update orders set paid_at = now() - interval '30 days'
        where merchant_id = (select id from merchants where slug = ${proxySlug})`;
      const billing = await request.post("/api/cron/bill-service-fee", {
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      });
      expect(billing.ok()).toBe(true);

      const invoices = await sql<
        { amount: number; merchant_id: string | null }[]
      >`
        select i.amount, i.merchant_id from service_fee_invoices i
        join event_organizers eo on eo.id = i.organizer_id
        where eo.phone = ${EO_PHONE}`;
      expect(invoices).toHaveLength(1);
      expect(invoices[0]).toMatchObject({ amount: 1000, merchant_id: null });

      await openEventAsEo(page);
      await page.goto("/eo");
      const invoiceSection = page
        .getByRole("heading", { name: "Tagihan Biaya Layanan" })
        .locator("xpath=../..");
      await expect(invoiceSection.getByText(/Rp\s?1\.000/)).toBeVisible();
      await expect(invoiceSection.getByText("Belum Lunas")).toBeVisible();

      // Lewat masa tenggang -> semua Gerai Titipan EO terkunci.
      await sql`
        update service_fee_invoices set due_at = now() - interval '30 days'
        where organizer_id = (select id from event_organizers where phone = ${EO_PHONE})`;
      await page.goto(`/e/${EVENT_SLUG}/${proxySlug}`);
      await expect(
        page.getByText("Lapak sedang tidak menerima pesanan"),
      ).toBeVisible();
      await page.goto("/eo");
      await expect(
        page.getByText(/tagihan Biaya Layanan menunggak/),
      ).toBeVisible();

      // Bersihkan supaya spec lain tidak ikut terkunci.
      await sql`
        update service_fee_invoices set status = 'lunas', paid_at = now()
        where organizer_id = (select id from event_organizers where phone = ${EO_PHONE})`;
    });

    test("EO lain tidak bisa memilih Gerai Titipan itu", async ({ page }) => {
      const [organizer] = await sql<{ id: string }[]>`
        insert into event_organizers
          (organization_name, contact_name, phone, password_hash, status)
        values ('EO Lain', 'Lain', '083300000099', 'x:y', 'approved')
        returning id`;
      await sql`
        insert into events (organizer_id, slug, name)
        values (${organizer.id}, 'event-eo-lain', 'Event EO Lain')`;

      await page.context().addCookies([await eoSessionCookie("083300000099")]);
      await page.goto("/eo");
      await page.getByRole("link", { name: /Event EO Lain/ }).click();
      await page.getByLabel("Cari Gerai").fill("Titipan");
      await expect(page.getByText("Gerai tidak ditemukan.")).toBeVisible();

      // EO tanpa QRIS: "Buat Gerai Titipan" meminta unggah QRIS dulu.
      await page.getByRole("button", { name: "Buat Gerai Titipan" }).click();
      const dialog = page.getByRole("dialog", { name: "Unggah QRIS dulu" });
      await expect(dialog).toBeVisible();
      await dialog.getByLabel("File foto QRIS").setInputFiles(QRIS_FIXTURE);
      const form = page.getByRole("dialog", { name: "Buat Gerai Titipan" });
      await expect(form.getByLabel("Nama Gerai")).toBeVisible();
      await form.getByLabel("Nama Gerai").fill("Toko EO Lain");
      await form.getByLabel("Kategori").fill("Oleh-oleh");
      await form
        .getByRole("button", { name: "Buat & Tambahkan ke Event" })
        .click();
      await expect(
        page.getByText("Gerai Titipan Toko EO Lain dibuat"),
      ).toBeVisible();

      const [created] = await sql<
        { payment_mode: string; qris_photo_url: string | null }[]
      >`select payment_mode, qris_photo_url from merchants where stall_name = 'Toko EO Lain'`;
      expect(created.payment_mode).toBe("qris_pribadi");
      expect(created.qris_photo_url).toMatch(/^\/uploads\/qris\//);
    });
  });
