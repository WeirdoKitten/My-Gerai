import path from "node:path";
import { expect, test } from "@playwright/test";

// Kredensial & fixture dari src/lib/db/seed.ts — Lapak KEDUA (Warung Cak
// Slamet), terpisah dari order-flow.spec.ts (Bakso Pak Budi) supaya tidak
// saling bentrok.
const MERCHANT_SLUG = "warung-cak-slamet";
const MERCHANT_PHONE = "084444444444";
const MERCHANT_PASSWORD = "password";
const ADMIN_PHONE = "081111111111";
const ADMIN_PASSWORD = "password";
const QRIS_FIXTURE = path.join(__dirname, "fixtures", "qris.png");

test.describe.serial("alur QRIS pribadi + tagihan Biaya Layanan", () => {
  let orderCode: string;

  test("Pedagang mengunggah foto QRIS pribadi", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Nomor HP").fill(MERCHANT_PHONE);
    await page.getByLabel("Password").fill(MERCHANT_PASSWORD);
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/dashboard/pembayaran");
    await expect(
      page.getByText("Payment Gateway (Midtrans)"),
    ).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles(QRIS_FIXTURE);
    await expect(
      page.getByRole("button", { name: "Ganti Foto QRIS" }),
    ).toBeVisible();
  });

  test("Admin memindahkan Lapak ke mode QRIS pribadi", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Nomor HP").fill(ADMIN_PHONE);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page).toHaveURL(/\/admin\/merchants$/);

    const card = page
      .getByText("Warung Cak Slamet", { exact: true })
      .locator("xpath=ancestor::*[contains(@class,'rounded-card')][1]");
    await card.getByRole("button", { name: "Ubah" }).click();
    await expect(
      card.getByAltText("Foto QRIS pribadi Pedagang"),
    ).toBeVisible();

    await card.getByRole("button", { name: /Pindah ke QRIS Pribadi/ }).click();
    await expect(card).toContainText("QRIS Pribadi");
  });

  test("Pembeli checkout via QRIS pribadi — bayar subtotal saja", async ({
    page,
  }) => {
    await page.goto(`/menu/${MERCHANT_SLUG}`);
    await page
      .getByRole("button", { name: "Tambah", exact: true })
      .first()
      .click();
    await page.getByRole("link", { name: /item/i }).click();
    await expect(page).toHaveURL(/\/checkout$/);

    // Beda dari mode gateway: TIDAK ada baris Biaya Layanan — Pembeli QRIS
    // pribadi bayar persis subtotal (lihat ADR QRIS pribadi).
    await expect(
      page.getByText("Biaya Layanan", { exact: true }),
    ).toHaveCount(0);
    // Rp13.000 = subtotal Nasi Goreng persis, TANPA Biaya Layanan Rp1.000 di
    // atasnya (beda dari mode gateway).
    await expect(
      page.getByRole("button", { name: /Buat Pesanan/ }),
    ).toContainText("13.000");

    await page.getByLabel("Nama").fill("Pembeli QRIS E2E");
    await page.getByRole("button", { name: /Buat Pesanan/ }).click();

    await expect(page).toHaveURL(/\/pesanan\/[0-9a-f-]+$/);
    await expect(page.getByText("Menunggu Pembayaran")).toBeVisible();
    await expect(page.getByAltText("QR pembayaran")).toBeVisible();
    await expect(
      page.getByText("Pindai QRIS Pedagang untuk membayar"),
    ).toBeVisible();
    await expect(
      page.getByText(/Pedagang akan menandai Pesanan ini lunas/),
    ).toBeVisible();
    // Bukan Pesanan mock — tombol simulasi Pembeli TIDAK boleh muncul.
    await expect(
      page.getByRole("button", { name: "Simulasikan Pembayaran Berhasil" }),
    ).toHaveCount(0);

    orderCode = (await page.locator("p.text-3xl").innerText()).trim();
    expect(orderCode).toMatch(/^[A-Z0-9]{4}$/);
  });

  test("Pedagang menandai Pesanan QRIS pribadi lunas", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Nomor HP").fill(MERCHANT_PHONE);
    await page.getByLabel("Password").fill(MERCHANT_PASSWORD);
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    const card = page
      .getByText(orderCode, { exact: true })
      .locator("xpath=ancestor::*[contains(@class,'rounded-card')][1]");
    await expect(card).toBeVisible();
    await expect(
      card.getByText("Pesanan QRIS pribadi", { exact: false }),
    ).toBeVisible();

    await card.getByRole("button", { name: "Tandai Lunas" }).click();
    await expect(
      page.getByText(`Pesanan ${orderCode} ditandai lunas`),
    ).toBeVisible();

    // Sekarang berlaku seperti Pesanan biasa (maju status manual Pedagang).
    await expect(
      card.getByRole("button", { name: "Tandai Diproses" }),
    ).toBeVisible();
  });
});
