import { expect, test } from "@playwright/test";

// Kredensial & fixture dari src/lib/db/seed.ts.
const MERCHANT_SLUG = "bakso-pak-budi";
const MERCHANT_PHONE = "081200000001";
const MERCHANT_PASSWORD = "Password123!";

test.describe
  .serial("alur checkout Pembeli & alur Pedagang", () => {
    let orderCode: string;

    test("Pembeli menyelesaikan checkout dan bayar", async ({ page }) => {
      await page.goto(`/menu/${MERCHANT_SLUG}`);

      const card = page.locator("div.rounded-lg.border").first();
      await expect(card).toBeVisible();
      await card.getByRole("button", { name: "Tambah ke Keranjang" }).click();

      await page.getByRole("link", { name: /Item di Keranjang/ }).click();
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
        .locator("div.rounded-lg.border")
        .filter({ hasText: orderCode });
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
      await expect(
        page.locator("div.rounded-lg.border").filter({ hasText: orderCode }),
      ).toHaveCount(0);
    });
  });
