import path from "node:path";
import {
  type Browser,
  type BrowserContext,
  expect,
  type Page,
  test,
} from "@playwright/test";
import dotenv from "dotenv";
import postgres from "postgres";

// Kredensial & fixture dari src/lib/db/seed.ts — Bakso Pak Budi sudah punya
// titik GPS + Pesanan Antar aktif (Ongkir Rp5.000, jangkauan 3 km). File ini
// jalan PALING AWAL (urutan alfabetis, workers: 1) — sebelum qris-pribadi
// memindah Lapak ke QRIS pribadi. Login Pedagang cuma SEKALI (beforeAll)
// supaya tidak menghabiskan budget rate-limit login per-IP (5/5 menit) yang
// dipakai spec lain.
const MERCHANT_SLUG = "bakso-pak-budi";
const MERCHANT_PHONE = "082222222222";
const MERCHANT_PASSWORD = "password";
const BUYER_PHONE_INPUT = "0812 3456 7890";
const BUYER_PHONE_WA = "6281234567890";

// Titik Lapak di seed: -6.9936, 107.6275.
const NEAR = { latitude: -6.995, longitude: 107.629 }; // ±0,2 km
const ONE_KM = { latitude: -7.002, longitude: 107.63 }; // ±1 km
const FAR = { latitude: -6.95, longitude: 107.6 }; // ±5,7 km

const { parsed } = dotenv.config({
  path: path.resolve(__dirname, "../../.env.test"),
});

async function buyerContext(
  browser: Browser,
  location: { latitude: number; longitude: number },
): Promise<BrowserContext> {
  return browser.newContext({
    geolocation: location,
    permissions: ["geolocation"],
  });
}

/** Tambah Item pertama ke Keranjang lalu buka checkout. */
async function openCheckout(page: Page): Promise<void> {
  await page.goto(`/menu/${MERCHANT_SLUG}`);
  await page
    .getByRole("button", { name: "Tambah", exact: true })
    .first()
    .click();
  await page.getByRole("link", { name: /item/i }).click();
  await expect(page).toHaveURL(/\/checkout$/);
}

async function fillDeliveryForm(page: Page, name: string): Promise<void> {
  // Kartu pilihan = <label> berisi radio tersembunyi — klik teks kartunya.
  await page.getByText("Diantar Kurir", { exact: true }).click();
  await expect(
    page.getByRole("radio", { name: /Diantar Kurir/ }),
  ).toBeChecked();
  await page.getByLabel("Nama").fill(name);
  await page.getByLabel("Nomor HP/WhatsApp").fill(BUYER_PHONE_INPUT);
  await page
    .getByLabel("Alamat pengantaran")
    .fill("Jl. Kenanga No. 5, RT 02/RW 03");
  await page.getByLabel("Patokan (opsional)").fill("Pagar hijau");
  await page
    .getByRole("button", { name: "Pakai lokasi saya sekarang" })
    .click();
  // Teks jarak ("227 m dari Lapak." atau "Di luar jangkauan antar (...)") —
  // muncul begitu pin terpasang. Di-anchor supaya tidak bentrok dengan hint
  // "maks. 3 km dari Lapak".
  await expect(
    page.getByText(/^(\d+(,\d+)? k?m dari Lapak\.|Di luar jangkauan antar)/),
  ).toBeVisible();
}

/** Checkout Diantar + simulasi bayar; hasil: kode & URL halaman status. */
async function placePaidDeliveryOrder(
  page: Page,
  name: string,
): Promise<{ orderCode: string; statusUrl: string }> {
  await openCheckout(page);
  await fillDeliveryForm(page, name);
  await page.getByRole("button", { name: /Buat Pesanan/ }).click();
  await expect(page).toHaveURL(/\/pesanan\/[0-9a-f-]+$/);
  const orderCode = (await page.locator("p.text-3xl").innerText()).trim();
  await page
    .getByRole("button", { name: "Simulasikan Pembayaran Berhasil" })
    .click();
  await expect(page.getByText("Dibayar", { exact: true })).toBeVisible();
  return { orderCode, statusUrl: page.url() };
}

function orderCard(page: Page, orderCode: string) {
  return page
    .getByText(orderCode, { exact: true })
    .locator("xpath=ancestor::*[contains(@class,'rounded-card')][1]");
}

test.describe
  .serial("alur Pesanan Antar (Fase 11)", () => {
    let merchantContext: BrowserContext;
    let merchantPage: Page;
    let deliveredOrder: { orderCode: string; statusUrl: string };

    test.beforeAll(async ({ browser }) => {
      merchantContext = await browser.newContext();
      merchantPage = await merchantContext.newPage();
      await merchantPage.goto("/login");
      await merchantPage.getByLabel("Nomor HP").fill(MERCHANT_PHONE);
      await merchantPage.getByLabel("Password").fill(MERCHANT_PASSWORD);
      await merchantPage.getByRole("button", { name: "Masuk" }).click();
      await expect(merchantPage).toHaveURL(/\/dashboard$/);
    });

    test.afterAll(async () => {
      await merchantContext.close();
    });

    test("Pembeli checkout Diantar — Ongkir masuk total", async ({
      browser,
    }) => {
      const context = await buyerContext(browser, NEAR);
      const page = await context.newPage();
      await openCheckout(page);

      // Ambil sendiri tetap default: tanpa Ongkir, tanpa field HP.
      await expect(page.getByText("Ongkir", { exact: true })).toHaveCount(0);
      await expect(page.getByLabel("Nomor HP/WhatsApp")).toHaveCount(0);

      await fillDeliveryForm(page, "Pembeli Antar E2E");
      await expect(page.getByText("Ongkir", { exact: true })).toBeVisible();
      // Bakso Halus Rp12.000 + Biaya Layanan Rp1.000 + Ongkir Rp5.000.
      await expect(
        page.getByRole("button", { name: /Buat Pesanan/ }),
      ).toContainText("18.000");

      await page.getByRole("button", { name: /Buat Pesanan/ }).click();
      await expect(page).toHaveURL(/\/pesanan\/[0-9a-f-]+$/);
      await expect(page.getByText("Diantar ke")).toBeVisible();
      await expect(
        page.getByText("Jl. Kenanga No. 5, RT 02/RW 03"),
      ).toBeVisible();
      await expect(page.getByText("Ongkir", { exact: true })).toBeVisible();
      const orderCode = (await page.locator("p.text-3xl").innerText()).trim();
      await page
        .getByRole("button", { name: "Simulasikan Pembayaran Berhasil" })
        .click();
      await expect(page.getByText("Dibayar", { exact: true })).toBeVisible();
      deliveredOrder = { orderCode, statusUrl: page.url() };

      // Halaman Lacak menampilkan Pesanan ini dari localStorage perangkat.
      await page.goto("/lacak");
      await expect(page.getByText(orderCode, { exact: true })).toBeVisible();
      await context.close();
    });

    test("Pedagang mengantar sampai Pesanan diterima", async ({ browser }) => {
      const { orderCode, statusUrl } = deliveredOrder;
      await merchantPage.goto("/dashboard");
      const card = orderCard(merchantPage, orderCode);
      await expect(card.getByText("Diantar", { exact: true })).toBeVisible();
      await expect(
        card.getByText("Jl. Kenanga No. 5, RT 02/RW 03"),
      ).toBeVisible();
      await expect(card.getByRole("link", { name: "Chat WA" })).toHaveAttribute(
        "href",
        `https://wa.me/${BUYER_PHONE_WA}`,
      );

      await card.getByRole("button", { name: "Tandai Diproses" }).click();
      await card.getByRole("button", { name: "Mulai Antar" }).click();
      await expect(
        card.getByRole("button", { name: "Tandai Sudah Diterima" }),
      ).toBeVisible();
      // Jeda 15 menit sebelum boleh menandai gagal (tanpa refund).
      await expect(
        card.getByRole("button", { name: /Gagal Diantar \(bisa dalam/ }),
      ).toBeDisabled();

      const buyer = await browser.newContext();
      const buyerPage = await buyer.newPage();
      await buyerPage.goto(statusUrl);
      await expect(
        buyerPage.getByText("Sedang Diantar", { exact: true }),
      ).toBeVisible();

      await card.getByRole("button", { name: "Tandai Sudah Diterima" }).click();
      await expect(
        merchantPage.getByText(orderCode, { exact: true }),
      ).toHaveCount(0);
      await expect(buyerPage.getByText("Selesai", { exact: true })).toBeVisible(
        { timeout: 10_000 },
      );
      await buyer.close();

      await merchantPage.goto("/dashboard/riwayat");
      const historyCard = orderCard(merchantPage, orderCode);
      await expect(historyCard).toContainText("Ongkir Rp");
      await expect(historyCard.getByText("Bagianmu")).toBeVisible();
    });

    test("Pedagang menandai gagal diantar setelah jeda", async ({
      browser,
    }) => {
      const context = await buyerContext(browser, NEAR);
      const page = await context.newPage();
      const { orderCode, statusUrl } = await placePaidDeliveryOrder(
        page,
        "Pembeli Gagal E2E",
      );

      await merchantPage.goto("/dashboard");
      const card = orderCard(merchantPage, orderCode);
      await card.getByRole("button", { name: "Tandai Diproses" }).click();
      await card.getByRole("button", { name: "Mulai Antar" }).click();
      await expect(
        card.getByRole("button", { name: /Gagal Diantar \(bisa dalam/ }),
      ).toBeDisabled();

      // Majukan waktu mulai antar 20 menit lewat DB (tidak menunggu 15 menit
      // sungguhan) — server tetap yang memutuskan boleh/tidaknya.
      const sql = postgres(parsed?.DATABASE_URL ?? "");
      await sql`update orders set delivery_started_at = now() - interval '20 minutes' where order_code = ${orderCode} and status = 'sedang_diantar'`;
      await sql.end();

      await merchantPage.reload();
      await card
        .getByRole("button", { name: "Gagal Diantar", exact: true })
        .click();
      await merchantPage
        .getByRole("button", { name: "Alamat tidak ditemukan" })
        .click();
      await merchantPage
        .getByRole("dialog")
        .getByRole("button", { name: "Tandai Gagal Diantar" })
        .click();
      await expect(
        merchantPage.getByText(`Pesanan ${orderCode} ditandai gagal diantar`),
      ).toBeVisible();

      await page.goto(statusUrl);
      await expect(
        page.getByText(/Pengantaran gagal: Alamat tidak ditemukan/),
      ).toBeVisible();
      await context.close();
    });

    test("Lacak Pesanan cukup dengan Kode Pesanan (tanpa localStorage)", async ({
      page,
    }) => {
      // Kode Pesanan: 8 karakter acak.
      expect(deliveredOrder.orderCode).toMatch(/^[A-Z0-9]{8}$/);

      await page.goto("/lacak");
      await page.getByLabel("Kode Pesanan").fill("ZZZZZZZZ");
      await page.getByRole("button", { name: "Lacak Pesanan" }).click();
      await expect(page.getByText(/Pesanan tidak ditemukan/)).toBeVisible();

      // Huruf kecil & spasi tetap diterima (dinormalisasi di server).
      const code = deliveredOrder.orderCode.toLowerCase();
      await page
        .getByLabel("Kode Pesanan")
        .fill(`${code.slice(0, 4)} ${code.slice(4)}`);
      await page.getByRole("button", { name: "Lacak Pesanan" }).click();
      await expect(page).toHaveURL(deliveredOrder.statusUrl);
    });

    test("Alamat di luar jangkauan ditolak (browser & server)", async ({
      browser,
    }) => {
      // Di browser: tombol dikunci dengan peringatan jarak.
      const far = await buyerContext(browser, FAR);
      const farPage = await far.newPage();
      await openCheckout(farPage);
      await fillDeliveryForm(farPage, "Pembeli Jauh E2E");
      await expect(farPage.getByText(/Di luar jangkauan antar/)).toBeVisible();
      await expect(
        farPage.getByRole("button", { name: /Buat Pesanan/ }),
      ).toBeDisabled();
      await far.close();

      // Di server: Pembeli membuka checkout (jangkauan 3 km, pin ±1 km), lalu
      // Pedagang mengecilkan jangkauan jadi 0,5 km sebelum Pembeli submit —
      // server harus menolak walau browser masih memakai pengaturan lama.
      const buyer = await buyerContext(browser, ONE_KM);
      const buyerPage = await buyer.newPage();
      await openCheckout(buyerPage);
      await fillDeliveryForm(buyerPage, "Pembeli Stale E2E");

      await merchantPage.goto("/dashboard/pengantaran");
      await merchantPage.getByLabel("Jangkauan maksimal (km)").fill("0.5");
      await merchantPage.getByRole("button", { name: "Simpan" }).click();
      await expect(
        merchantPage.getByText("Pengaturan antar disimpan."),
      ).toBeVisible();

      await buyerPage.getByRole("button", { name: /Buat Pesanan/ }).click();
      await expect(
        buyerPage.getByText(/Alamat di luar jangkauan antar Lapak/),
      ).toBeVisible();
      await expect(buyerPage).toHaveURL(/\/checkout$/);
      await buyer.close();

      // Kembalikan pengaturan seed untuk spec berikutnya.
      await merchantPage.getByLabel("Jangkauan maksimal (km)").fill("3");
      await merchantPage.getByRole("button", { name: "Simpan" }).click();
      await expect(
        merchantPage.getByText("Pengaturan antar disimpan."),
      ).toBeVisible();
    });
  });
