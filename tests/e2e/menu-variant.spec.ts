import path from "node:path";
import { expect, test } from "@playwright/test";
import dotenv from "dotenv";
import postgres from "postgres";

// Varian disuntik langsung ke DB test (tanpa login Pedagang) supaya tidak
// memakan budget rate-limit login per-IP yang dipakai spec lain. Dihapus lagi
// di afterAll supaya spec lain (order-flow, dst) melihat menu seed asli.
const MERCHANT_SLUG = "bakso-pak-budi";
const PRODUCT_NAME = "Bakso Urat"; // Rp15.000 di seed

const { parsed } = dotenv.config({
  path: path.resolve(__dirname, "../../.env.test"),
});
const sql = postgres(parsed?.DATABASE_URL ?? "");
const BASE = parsed?.APP_URL ?? "http://localhost:3100";

/** Purge cache katalog lewat seam E2E (fixture SQL mentah tidak memicu invalidasi server action). */
async function revalidateStall() {
  await fetch(`${BASE}/api/test-hooks/revalidate-stall`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slug: MERCHANT_SLUG }),
  });
}
let groupId: string;

test.beforeAll(async () => {
  const [group] = await sql`
    insert into product_variant_groups (product_id, name, sort_order)
    select id, 'Level Pedas', 0 from products where name = ${PRODUCT_NAME}
    returning id`;
  groupId = group.id;
  await sql`
    insert into product_variant_options (group_id, name, price_delta, sort_order)
    values (${groupId}, 'Sedang', 0, 0), (${groupId}, 'Pedas', 2000, 1)`;
  await revalidateStall();
});

test.afterAll(async () => {
  await sql`delete from product_variant_groups where id = ${groupId}`;
  await revalidateStall();
  await sql.end();
});

test("varian tidak tampil di kartu menu, baru muncul di popup saat Tambah", async ({
  page,
}) => {
  await page.goto(`/menu/${MERCHANT_SLUG}`);

  // `.first()`: judul popup (<dialog>, selalu ada di DOM) juga memuat nama Item.
  const card = page
    .getByText(PRODUCT_NAME, { exact: true })
    .locator("xpath=ancestor::*[contains(@class,'rounded-card')][1]")
    .first();
  await expect(card).toBeVisible();
  // Kartu ringkas: pilihan varian & kolom catatan tidak terlihat (keduanya
  // ada di popup yang masih tertutup).
  await expect(card.getByText("Level Pedas")).toBeHidden();
  await expect(card.getByPlaceholder("Catatan (opsional)")).toBeHidden();

  // Jumlah dipilih di kartu (sama seperti Item tanpa varian), terbawa ke popup.
  await card
    .getByRole("button", { name: `Tambah jumlah ${PRODUCT_NAME}` })
    .first()
    .click();
  await card.getByRole("button", { name: "Tambah", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Level Pedas")).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Pilih dulu semua pilihan" }),
  ).toBeDisabled();

  await dialog.getByRole("button", { name: /^Pedas/ }).click();
  // (15.000 + 2.000) × 2
  const submit = dialog.getByRole("button", { name: /Tambah ke Keranjang/ });
  await expect(submit).toContainText("34.000");
  await submit.click();
  await expect(page.getByText(`2 ${PRODUCT_NAME} ditambahkan`)).toBeVisible();
  await expect(dialog).toBeHidden();

  await page.getByRole("link", { name: /item/i }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByText("Level Pedas: Pedas")).toBeVisible();

  // Kosongkan Keranjang supaya tidak terbawa ke spec lain (localStorage per context, aman).
});
