import { expect, test } from "@playwright/test";

const MERCHANT_SLUG = "bakso-pak-budi";
const PRODUCT_NAME = "Bakso Urat"; // punya foto di seed

test("ketuk foto Item membuka foto besar, lalu bisa ditutup", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/menu/${MERCHANT_SLUG}`);

  const zoomDialog = page.getByRole("dialog", { name: `Foto ${PRODUCT_NAME}` });
  await expect(zoomDialog).toBeHidden();

  await page
    .getByRole("button", { name: `Perbesar foto ${PRODUCT_NAME}` })
    .click();
  await expect(zoomDialog).toBeVisible();
  const bigPhoto = zoomDialog.getByRole("img", { name: PRODUCT_NAME });
  await expect(bigPhoto).toBeVisible();
  // Foto besar memang lebih lebar dari thumbnail 80px.
  const box = await bigPhoto.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(300);

  await zoomDialog.getByRole("button", { name: "Tutup" }).click();
  await expect(zoomDialog).toBeHidden();

  // Esc juga menutup.
  await page
    .getByRole("button", { name: `Perbesar foto ${PRODUCT_NAME}` })
    .click();
  await expect(zoomDialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(zoomDialog).toBeHidden();
});
