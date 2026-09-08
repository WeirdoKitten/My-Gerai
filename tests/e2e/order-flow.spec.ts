import { expect, test } from "@playwright/test";

// Kredensial & fixture dari src/lib/db/seed.ts.
const MERCHANT_SLUG = "bakso-pak-budi";
const MERCHANT_PHONE = "082222222222";
const MERCHANT_PASSWORD = "password";

test.describe
  .serial("alur checkout Pembeli & alur Pedagang", () => {
    let orderCode: string;

    test("Pembeli menyelesaikan checkout dan bayar", async ({ page }) => {
      await page.goto(`/menu/${MERCHANT_SLUG}`);

      await page
        .getByRole("button", { name: "Tambah", exact: true })
        .first()
        .click();

      await page.getByRole("link", { name: /item/i }).click();
      await expect(page).toHaveURL(/\/checkout$/);

      await page.getByLabel("Nama").fill("Pembeli E2E");
      await page.getByRole("button", { name: "Buat Pesanan" }).click();

      await expect(page).toHaveURL(/\/pesanan\/[0-9a-f-]+$/);
      await expect(page.getByText("Menunggu Pembayaran")).toBeVisible();
      await expect(page.getByAltText("QR pembayaran")).toBeVisible();

      orderCode = (await page.locator("p.text-3xl").innerText()).trim();
      expect(orderCode).toMatch(/^[A-Z0-9]{4}$/);

      await page
        .getByRole("button", { name: "Simulasikan Pembayaran Berhasil" })
        .click();
      await expect(page.getByText("Dibayar", { exact: true })).toBeVisible();
    });

    test("Pedagang menerima dan menyelesaikan Pesanan", async ({ page }) => {
      await page.goto("/login");
      await page.getByLabel("Nomor HP").fill(MERCHANT_PHONE);
      await page.getByLabel("Password").fill(MERCHANT_PASSWORD);
      await page.getByRole("button", { name: "Masuk" }).click();
      await expect(page).toHaveURL(/\/dashboard$/);

      const card = page
        .getByText(orderCode, { exact: true })
        .locator("xpath=ancestor::*[contains(@class,'rounded-card')][1]");
      await expect(card).toBeVisible();

      // Regresi bug nyata Fase 3: tombol dulu macet di "Memproses..." setelah
      // update sukses (lupa reset state `submitting`) — lihat CHANGELOG.md.
      await card.getByRole("button", { name: "Tandai Diproses" }).click();
      await expect(
        card.getByRole("button", { name: "Tandai Siap Diambil" }),
      ).toBeVisible();

      await card.getByRole("button", { name: "Tandai Siap Diambil" }).click();
      await expect(
        card.getByRole("button", { name: "Tandai Selesai" }),
      ).toBeVisible();

      await card.getByRole("button", { name: "Tandai Selesai" }).click();
      await expect(page.getByText(orderCode, { exact: true })).toHaveCount(0);
    });
  });
