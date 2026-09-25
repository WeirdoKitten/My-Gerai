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

      // Biaya Layanan dibebankan ke Pembeli (ADR 2026-09-09).
      await expect(
        page.getByText("Biaya Layanan", { exact: true }),
      ).toBeVisible();

      await page.getByLabel("Nama").fill("Pembeli E2E");
      await page.getByRole("button", { name: /Buat Pesanan/ }).click();

      await expect(page).toHaveURL(/\/pesanan\/[0-9a-f-]+$/);
      await expect(page.getByText("Menunggu Pembayaran")).toBeVisible();
      await expect(page.getByAltText("QR pembayaran")).toBeVisible();
      await expect(page.getByText("Total Dibayar")).toBeVisible();

      orderCode = (await page.locator("p.text-3xl").innerText()).trim();
      expect(orderCode).toMatch(/^[A-Z0-9]{4}$/);

      await page
        .getByRole("button", { name: "Simulasikan Pembayaran Berhasil" })
        .click();
      await expect(page.getByText("Dibayar", { exact: true })).toBeVisible();
    });

    test("Pedagang menerima dan menyelesaikan Pesanan", async ({ page }) => {
      // Printer thermal Bluetooth tiruan — Web Bluetooth tidak bisa dipakai
      // di Playwright; byte ESC/POS yang dikirim ditampung di window.
      await page.addInitScript(() => {
        const printed: number[] = [];
        Object.assign(window, { __printed: printed });
        const characteristic = {
          properties: { write: true, writeWithoutResponse: false },
          writeValueWithResponse: async (value: Uint8Array) => {
            printed.push(...value);
          },
          writeValueWithoutResponse: async () => {},
        };
        const server = {
          connected: true,
          connect: async () => server,
          getPrimaryServices: async () => [
            { getCharacteristics: async () => [characteristic] },
          ],
        };
        Object.defineProperty(navigator, "bluetooth", {
          value: { requestDevice: async () => ({ gatt: server }) },
        });
      });

      await page.goto("/login");
      await page.getByLabel("Nomor HP").fill(MERCHANT_PHONE);
      await page.getByLabel("Password").fill(MERCHANT_PASSWORD);
      await page.getByRole("button", { name: "Masuk" }).click();
      await expect(page).toHaveURL(/\/dashboard$/);

      const card = page
        .getByText(orderCode, { exact: true })
        .locator("xpath=ancestor::*[contains(@class,'rounded-card')][1]");
      await expect(card).toBeVisible();

      // Pratinjau struk tampil tanpa printer; cetak dari dalam Modal.
      await card.getByRole("button", { name: "Lihat Struk" }).click();
      const preview = page.getByRole("img", { name: "Pratinjau struk" });
      await expect(preview).toContainText("BAKSO PAK BUDI");
      await expect(preview).toContainText("dapat dikembalikan");
      await page.getByRole("button", { name: "Cetak ke Printer" }).click();
      await expect(page.getByText(`Struk ${orderCode} dicetak`)).toBeVisible();
      const receiptText = await page.evaluate(() =>
        String.fromCharCode(
          ...(window as unknown as { __printed: number[] }).__printed,
        ),
      );
      expect(receiptText).toContain("BAKSO PAK BUDI");
      expect(receiptText).toContain(orderCode);
      expect(receiptText).toContain("Pembeli E2E");
      expect(receiptText).toContain("Biaya Layanan");
      expect(receiptText).toMatch(/TOTAL\s+Rp[\d.]+/);
      expect(receiptText).toContain("dapat dikembalikan");

      await page.getByRole("button", { name: "Tutup" }).click();

      // Regresi bug nyata Fase 3: tombol dulu macet di "Memproses..." setelah
      // update sukses (lupa reset state `submitting`) — lihat CHANGELOG.md.
      await card.getByRole("button", { name: "Tandai Diproses" }).click();
      await expect(
        page.getByText(`Pesanan ${orderCode} ditandai Diproses`),
      ).toBeVisible();
      await expect(
        card.getByRole("button", { name: "Tandai Siap Diambil" }),
      ).toBeVisible();

      await card.getByRole("button", { name: "Tandai Siap Diambil" }).click();
      await expect(
        card.getByRole("button", { name: "Tandai Selesai" }),
      ).toBeVisible();

      await card.getByRole("button", { name: "Tandai Selesai" }).click();
      await expect(page.getByText(orderCode, { exact: true })).toHaveCount(0);

      // Pesanan yang selesai pindah dari daftar aktif ke tab Riwayat.
      await page.getByRole("link", { name: "Riwayat" }).click();
      await expect(page).toHaveURL(/\/dashboard\/riwayat$/);

      const historyCard = page
        .getByText(orderCode, { exact: true })
        .locator("xpath=ancestor::*[contains(@class,'rounded-card')][1]");
      await expect(historyCard).toBeVisible();
      await expect(
        historyCard.getByText("Selesai", { exact: true }),
      ).toBeVisible();
      await expect(historyCard.getByText("Bagianmu")).toBeVisible();

      // Laporan Penjualan menghitung Pesanan yang sudah dibayar; dengan 1
      // Pesanan asisten masih menunggu data (ambang belum tercapai).
      await page.getByRole("link", { name: "Laporan" }).click();
      await expect(page).toHaveURL(/\/dashboard\/laporan/);
      await expect(
        page.getByRole("heading", { name: "Laporan Penjualan" }),
      ).toBeVisible();
      await expect(page.getByText("Omzet")).toBeVisible();
      await expect(page.getByText(/Asisten butuh setidaknya/)).toBeVisible();
    });
  });
