import { createHash, randomBytes } from "node:crypto";
import path from "node:path";
import { expect, test } from "@playwright/test";
import dotenv from "dotenv";
import postgres from "postgres";

// Kredensial dari src/lib/db/seed.ts. EO baru didaftarkan lewat UI supaya
// alur daftar → disetujui Admin → login ikut teruji.
const ADMIN_PHONE = "081111111111";
const PASSWORD = "password";
const EO_PHONE = "083300000001";
const EO_NAME = "EO Uji E2E";
const EVENT_NAME = "Event Uji E2E";
const STALL_ONE = "Bakso Pak Budi";
const STALL_TWO = "Nasi Goreng Raja Rasa";

const { parsed } = dotenv.config({
  path: path.resolve(__dirname, "../../.env.test"),
});
const sql = postgres(parsed?.DATABASE_URL ?? "");

test.afterAll(async () => {
  await sql.end();
});

/**
 * Sesi Pedagang disuntik langsung ke DB (bukan login lewat form) — budget
 * rate-limit login Pedagang per IP (5/5 menit) sudah habis dipakai spec lain
 * dalam proses server yang sama.
 */
async function merchantSessionCookie(slug: string) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await sql`
    insert into sessions (merchant_id, token_hash, expires_at)
    select id, ${tokenHash}, now() + interval '1 day'
    from merchants where slug = ${slug}`;
  return {
    name: "mygerai_session",
    value: token,
    domain: "localhost",
    path: "/",
  };
}

test.describe
  .serial("Portal EO", () => {
    let eventUrl: string;
    let paidOrderCode: string;

    test("EO mendaftar dan menunggu persetujuan", async ({ page }) => {
      await page.goto("/eo/daftar");
      await page.getByLabel("Nama EO / organisasi").fill(EO_NAME);
      await page.getByLabel("Nama penanggung jawab").fill("Penanggung Jawab");
      await page.getByLabel("Nomor HP").fill(EO_PHONE);
      await page.getByLabel("Password").fill(PASSWORD);
      await page.getByRole("button", { name: "Daftar" }).click();
      await expect(page).toHaveURL(/\/eo\/daftar\/status$/);

      // Belum disetujui -> login ditolak dengan pesan status.
      await page.goto("/eo/login");
      await page.getByLabel("Nomor HP").fill(EO_PHONE);
      await page.getByLabel("Password").fill(PASSWORD);
      await page.getByRole("button", { name: "Masuk" }).click();
      await expect(page.getByText(/sedang ditinjau Admin/)).toBeVisible();
    });

    test("Admin menyetujui EO", async ({ page }) => {
      await page.goto("/admin/login");
      await page.getByLabel("Nomor HP").fill(ADMIN_PHONE);
      await page.getByLabel("Password").fill(PASSWORD);
      await page.getByRole("button", { name: "Masuk" }).click();
      await expect(page).toHaveURL(/\/admin/);

      await page.getByRole("link", { name: "EO" }).click();
      await expect(page).toHaveURL(/\/admin\/eo$/);
      const row = page
        .getByText(EO_NAME, { exact: true })
        .locator("xpath=ancestor::*[contains(@class,'rounded-card')][1]");
      await row.getByRole("button", { name: "Setujui" }).click();
      await expect(page.getByText("Tidak ada EO yang menunggu.")).toBeVisible();
    });

    test("EO membuat event, memilih Gerai, mendapat QR", async ({ page }) => {
      await page.goto("/eo/login");
      await page.getByLabel("Nomor HP").fill(EO_PHONE);
      await page.getByLabel("Password").fill(PASSWORD);
      await page.getByRole("button", { name: "Masuk" }).click();
      await expect(page).toHaveURL(/\/eo$/);

      await page.getByLabel("Nama event").fill(EVENT_NAME);
      await page
        .getByLabel("Info untuk peserta (opsional)")
        .fill("Ambil oleh-oleh pukul 15.00 di Gerai masing-masing.");
      await page.getByRole("button", { name: "Buat Event" }).click();
      await expect(page).toHaveURL(/\/eo\/event\/[0-9a-f-]+$/);
      await expect(page.getByAltText("Poster QR Event")).toBeVisible();

      const search = page.getByLabel("Cari Gerai");
      await search.fill("Bakso");
      await page.getByRole("button", { name: new RegExp(STALL_ONE) }).click();
      await search.fill("Raja");
      await page.getByRole("button", { name: new RegExp(STALL_TWO) }).click();
      await page.getByRole("button", { name: "Simpan Gerai" }).click();
      await expect(page.getByText("Daftar Gerai disimpan")).toBeVisible();

      eventUrl = (await page.locator("p.break-all").first().innerText()).trim();
      expect(eventUrl).toMatch(/\/e\/event-uji-e2e(-[a-z0-9]+)?$/);
    });

    test("Peserta memesan dari dua Gerai lewat halaman event", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      const eventPath = new URL(eventUrl).pathname;
      await page.goto(eventPath);
      await expect(
        page.getByRole("heading", { name: EVENT_NAME }),
      ).toBeVisible();
      await expect(page.getByText(/pukul 15\.00/)).toBeVisible();

      // Gerai pertama: checkout, opsi Diantar tidak ditawarkan, bayar.
      await page.getByRole("link", { name: new RegExp(STALL_ONE) }).click();
      await expect(
        page.getByText(`← Gerai lain di ${EVENT_NAME}`),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Tambah", exact: true })
        .first()
        .click();
      await page.getByRole("link", { name: /item/i }).click();
      await expect(page).toHaveURL(/\/checkout$/);
      await expect(page.getByText("Pesanan event.")).toBeVisible();
      await expect(page.getByText("Diantar", { exact: true })).toHaveCount(0);
      await page.getByLabel("Nama").fill("Peserta E2E");
      await page.getByRole("button", { name: /Buat Pesanan/ }).click();
      await expect(page).toHaveURL(/\/pesanan\/[0-9a-f-]+$/);
      paidOrderCode = (await page.locator("p.text-3xl").innerText()).trim();
      await page
        .getByRole("button", { name: "Simulasikan Pembayaran Berhasil" })
        .click();
      await expect(page.getByText("Dibayar", { exact: true })).toBeVisible();
      await expect(page.getByText(/Pesanan dari event/)).toBeVisible();

      // Gerai kedua lewat tautan "Belanja di Gerai lain".
      await page
        .getByRole("link", { name: "Belanja di Gerai lain di event ini" })
        .click();
      await page.getByRole("link", { name: new RegExp(STALL_TWO) }).click();
      await page
        .getByRole("button", { name: "Tambah", exact: true })
        .first()
        .click();
      await page.getByRole("link", { name: /item/i }).click();
      await page.getByLabel("Nama").fill("Peserta E2E");
      await page.getByRole("button", { name: /Buat Pesanan/ }).click();
      await expect(page).toHaveURL(/\/pesanan\/[0-9a-f-]+$/);

      // Halaman event merangkum kedua Pesanan di perangkat ini.
      await page.goto(eventPath);
      const myOrders = page
        .getByRole("heading", { name: "Pesanan kamu di event ini" })
        .locator("xpath=..");
      await expect(myOrders.getByText(STALL_ONE)).toBeVisible();
      await expect(myOrders.getByText(STALL_TWO)).toBeVisible();
      await expect(myOrders.getByText(paidOrderCode)).toBeVisible();
    });

    test("EO melihat Pesanan, Pedagang melihat badge event", async ({
      page,
      context,
    }) => {
      await page.goto("/eo/login");
      await page.getByLabel("Nomor HP").fill(EO_PHONE);
      await page.getByLabel("Password").fill(PASSWORD);
      await page.getByRole("button", { name: "Masuk" }).click();
      await page.getByRole("link", { name: new RegExp(EVENT_NAME) }).click();

      // Hanya Pesanan yang sudah dibayar yang tampil.
      await expect(
        page.getByText(paidOrderCode, { exact: true }),
      ).toBeVisible();
      await expect(page.getByText("1 Pesanan")).toBeVisible();

      await context.addCookies([await merchantSessionCookie("bakso-pak-budi")]);
      await page.goto("/dashboard");
      const card = page
        .getByText(paidOrderCode, { exact: true })
        .locator("xpath=ancestor::*[contains(@class,'rounded-card')][1]");
      await expect(card.getByText(`Event: ${EVENT_NAME}`)).toBeVisible();
    });

    test("EO menonaktifkan event", async ({ page }) => {
      await page.goto("/eo/login");
      await page.getByLabel("Nomor HP").fill(EO_PHONE);
      await page.getByLabel("Password").fill(PASSWORD);
      await page.getByRole("button", { name: "Masuk" }).click();
      await page.getByRole("link", { name: new RegExp(EVENT_NAME) }).click();

      await page.getByRole("switch", { name: "Event aktif" }).click();
      await page.getByRole("button", { name: "Simpan Event" }).click();
      await expect(page.getByText("Event disimpan")).toBeVisible();

      await page.goto(new URL(eventUrl).pathname);
      await expect(page.getByText("Event sudah berakhir")).toBeVisible();
    });
  });
