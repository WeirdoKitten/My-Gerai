import path from "node:path";
import { expect, test } from "@playwright/test";
import dotenv from "dotenv";
import postgres from "postgres";

// Item pre-order disuntik langsung ke DB test (tanpa login Pedagang, hemat
// budget rate-limit login per-IP), lalu Lapak dibuat TUTUP lewat override
// manual -- pre-order tetap harus bisa dipesan, Item biasa tidak. Semua
// dikembalikan di afterAll supaya spec lain melihat seed asli.
const MERCHANT_SLUG = "bakso-pak-budi";
const PRODUCT_NAME = "Tumpeng E2E";

const { parsed } = dotenv.config({
  path: path.resolve(__dirname, "../../.env.test"),
});
const sql = postgres(parsed?.DATABASE_URL ?? "");
let productId: string;

test.beforeAll(async () => {
  const [product] = await sql`
    insert into products (merchant_id, name, price, pre_order_min_days, pre_order_max_days)
    select id, ${PRODUCT_NAME}, 250000, 2, 14 from merchants where slug = ${MERCHANT_SLUG}
    returning id`;
  productId = product.id;
  await sql`
    update merchants set manual_override = 'closed', manual_override_set_at = now()
    where slug = ${MERCHANT_SLUG}`;
});

test.afterAll(async () => {
  await sql`
    update merchants set manual_override = null, manual_override_set_at = null
    where slug = ${MERCHANT_SLUG}`;
  await sql`delete from order_items where product_id = ${productId}`;
  await sql`delete from products where id = ${productId}`;
  await sql.end();
});

function productCard(page: import("@playwright/test").Page, name: string) {
  return page
    .getByText(name, { exact: true })
    .locator("xpath=ancestor::*[contains(@class,'rounded-card')][1]")
    .first();
}

test("pre-order: dipesan saat Lapak tutup dengan jadwal, tidak campur Item biasa", async ({
  page,
}) => {
  await page.goto(`/menu/${MERCHANT_SLUG}`);
  // Popup Lapak tutup menyebut pre-order tetap bisa dipesan.
  await expect(
    page.getByText(/Item pre-order tetap bisa dipesan sekarang/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mengerti" }).click();

  const tumpeng = productCard(page, PRODUCT_NAME);
  await expect(tumpeng.getByText("Pre-order · siap min. 2 hari")).toBeVisible();

  // Item biasa dulu, lalu pre-order -> diminta konfirmasi, batal = tidak berubah.
  await productCard(page, "Bakso Halus")
    .getByRole("button", { name: "Tambah", exact: true })
    .click();
  await tumpeng.getByRole("button", { name: "Tambah", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Ganti isi Keranjang?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Kosongkan & Tambah" }).click();
  await expect(page.getByRole("link", { name: /1 item/ })).toBeVisible();

  await page.getByRole("link", { name: /item/i }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByText("Jadwal ambil")).toBeVisible();

  await page.getByLabel("Nama").fill("Pembeli Pre-order");
  await page.getByLabel("Nomor HP/WhatsApp").fill("0812 3456 7890");

  // Tanpa jadwal -> ditolak di browser.
  await page.getByRole("button", { name: /Buat Pesanan/ }).click();
  await expect(page.getByText("Pilih tanggal dan jam ambil.")).toBeVisible();

  const dateSelect = page.getByLabel("Tanggal", { exact: true });
  const timeSelect = page.getByLabel("Jam", { exact: true });
  await expect(timeSelect).toBeDisabled();
  // Opsi pertama yang bisa dipilih = paling cepat hari ini + 2.
  const firstDay = await dateSelect
    .locator("option:not([disabled])")
    .first()
    .getAttribute("value");
  await dateSelect.selectOption(firstDay ?? "");
  const firstTime = await timeSelect
    .locator("option:not([disabled])")
    .first()
    .getAttribute("value");
  await timeSelect.selectOption(firstTime ?? "");
  await expect(page.getByText(/^Diambil /)).toBeVisible();

  await page.getByRole("button", { name: /Buat Pesanan/ }).click();
  await expect(page).toHaveURL(/\/pesanan\/[0-9a-f-]+$/);
  await page
    .getByRole("button", { name: "Simulasikan Pembayaran Berhasil" })
    .click();
  await expect(page.getByText("Dibayar", { exact: true })).toBeVisible();
  await expect(page.getByText(/^Pre-order · Diambil /)).toBeVisible();

  const [order] = await sql`
    select scheduled_for, buyer_phone from orders
    where buyer_name = 'Pembeli Pre-order' order by created_at desc limit 1`;
  expect(order.buyer_phone).toBe("6281234567890");
  expect(order.scheduled_for).not.toBeNull();
});

test("Item biasa tetap tidak bisa checkout saat Lapak tutup", async ({
  page,
}) => {
  await page.goto(`/menu/${MERCHANT_SLUG}`);
  await page.getByRole("button", { name: "Mengerti" }).click();
  await productCard(page, "Bakso Halus")
    .getByRole("button", { name: "Tambah", exact: true })
    .click();
  await page.getByRole("link", { name: /item/i }).click();
  await expect(
    page.getByRole("dialog", { name: "Lapak Sedang Tutup" }),
  ).toBeVisible();
});
