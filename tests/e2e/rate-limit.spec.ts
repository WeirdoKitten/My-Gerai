import { expect, test } from "@playwright/test";

// Nomor HP tidak terdaftar khusus test ini (di luar fixture seed) — supaya
// tidak berbagi budget "per nomor HP" dengan test login lain dalam suite.
const TARGET_PHONE = "089900000099";
const RATE_LIMIT_MESSAGE =
  "Terlalu banyak percobaan. Silakan coba lagi dalam beberapa menit.";

test("loginMerchant diblokir setelah percobaan berulang (rate-limit sisi server)", async ({
  page,
}) => {
  await page.goto("/login");

  let lastMessage = "";

  // 7x percobaan: cukup untuk melebihi budget per-IP (5/5menit) walau ada
  // sisa budget yang sudah terpakai test lain dalam proses server yang sama —
  // tidak menebak percobaan ke berapa persis yang diblokir.
  for (let attempt = 1; attempt <= 7; attempt++) {
    await page.getByLabel("Nomor HP").fill(TARGET_PHONE);
    await page.getByLabel("Password").fill("password-salah");
    await page.getByRole("button", { name: "Masuk" }).click();

    const errorText = page.locator("p.text-red-600");
    await expect(errorText).toBeVisible();
    lastMessage = (await errorText.innerText()).trim();

    if (lastMessage === RATE_LIMIT_MESSAGE) break;
  }

  expect(lastMessage).toBe(RATE_LIMIT_MESSAGE);
});
