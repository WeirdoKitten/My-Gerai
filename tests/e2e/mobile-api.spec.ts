import { readFile } from "node:fs/promises";
import path from "node:path";
import { type APIRequestContext, expect, test } from "@playwright/test";

// API aplikasi Android Pedagang (Fase 12a, docs/API-MOBILE.md).
// Kredensial dari src/lib/db/seed.ts. Sengaja TIDAK login sebagai Bakso Pak
// Budi: budget rate-limit login per No. HP (5/5 menit, satu proses server)
// sudah habis dipakai spec lain. Alur utama memakai Nasi Goreng (mode QRIS
// Pribadi, jadi sekaligus menguji `mark-paid`); Pedagang pembanding = Lapak
// baru yang didaftarkan lewat API lalu disetujui Admin. Setiap login API
// memakai IP tiruan sendiri (`cf-connecting-ip`).
const API = "/api/mobile/v1";
const NASGOR = { slug: "nasi-goreng-raja-rasa", phone: "082343455263" };
const ADMIN_PHONE = "081111111111";
const PASSWORD = "password";
const NEW_STALL = "Cilok API Test";
const NEW_PASSWORD = "password123";
const PHOTO_FIXTURE = path.join(__dirname, "fixtures", "qris.png");

async function login(
  request: APIRequestContext,
  phone: string,
  password: string,
  ip: string,
): Promise<string> {
  const res = await request.post(`${API}/auth/login`, {
    data: { phone, password },
    headers: { "cf-connecting-ip": ip },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.data.status).toBe("approved");
  return body.data.token as string;
}

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

test.describe
  .serial("API mobile Pedagang", () => {
    const newPhone = `0897${String(Date.now()).slice(-8)}`;
    let token: string;
    let otherToken: string;
    let orderId: string;

    test("meta publik, endpoint lain wajib Bearer", async ({ request }) => {
      const meta = await request.get(`${API}/meta`);
      expect(meta.status()).toBe(200);
      expect((await meta.json()).data.apiVersion).toBe(1);

      const me = await request.get(`${API}/me`);
      expect(me.status()).toBe(401);
      expect(await me.json()).toMatchObject({
        ok: false,
        error: { code: "unauthorized" },
      });

      const fake = await request.get(`${API}/orders`, {
        headers: bearer("x".repeat(43)),
      });
      expect(fake.status()).toBe(401);
    });

    test("validasi input dan login gagal memakai format error API", async ({
      request,
    }) => {
      const invalid = await request.post(`${API}/auth/login`, {
        data: { phone: "123" },
        headers: { "cf-connecting-ip": "10.12.0.1" },
      });
      expect(invalid.status()).toBe(422);

      const wrong = await request.post(`${API}/auth/login`, {
        data: { phone: "089900001234", password: "salah-sekali" },
        headers: { "cf-connecting-ip": "10.12.0.2" },
      });
      expect(wrong.status()).toBe(400);
      expect((await wrong.json()).error.message).toBe(
        "Nomor HP atau password salah.",
      );
    });

    test("daftar Lapak baru → login masih menunggu persetujuan, tanpa token", async ({
      request,
    }) => {
      const headers = { "cf-connecting-ip": "10.12.0.3" };
      const reg = await request.post(`${API}/auth/register`, {
        data: {
          stallName: NEW_STALL,
          ownerName: "Penguji",
          category: "Makanan",
          phone: newPhone,
          password: NEW_PASSWORD,
        },
        headers,
      });
      expect(reg.status()).toBe(200);

      const res = await request.post(`${API}/auth/login`, {
        data: { phone: newPhone, password: NEW_PASSWORD },
        headers,
      });
      const body = await res.json();
      expect(body.data.status).toBe("pending");
      expect(body.data.token).toBeUndefined();
    });

    test("Admin menyetujui Lapak baru, lalu Lapak itu bisa login lewat API", async ({
      page,
      request,
    }) => {
      await page.goto("/admin/login");
      await page.getByLabel("Nomor HP").fill(ADMIN_PHONE);
      await page.getByLabel("Password").fill(PASSWORD);
      await page.getByRole("button", { name: "Masuk" }).click();
      await expect(page).toHaveURL(/\/admin\/merchants$/);

      const row = page
        .getByText(NEW_STALL, { exact: true })
        .locator("xpath=ancestor::*[contains(@class,'rounded-card')][1]");
      await row.getByRole("button", { name: "Setujui" }).click();
      await expect(row).toContainText("Disetujui");

      otherToken = await login(request, newPhone, NEW_PASSWORD, "10.12.0.4");
    });

    test("Pedagang login lewat API dan mendaftarkan token push", async ({
      request,
    }) => {
      token = await login(request, NASGOR.phone, PASSWORD, "10.12.0.5");

      const me = await request.get(`${API}/me`, { headers: bearer(token) });
      expect(me.status()).toBe(200);
      expect((await me.json()).data.slug).toBe(NASGOR.slug);

      const badDevice = await request.put(`${API}/devices`, {
        data: { pushToken: "bukan-token-expo" },
        headers: bearer(token),
      });
      expect(badDevice.status()).toBe(422);

      const device = await request.put(`${API}/devices`, {
        data: { pushToken: "ExponentPushToken[e2e-nasgor-1]" },
        headers: bearer(token),
      });
      expect(device.status()).toBe(200);
    });

    test("Pesanan QRIS Pribadi ditandai lunas lewat API, status diubah sampai selesai", async ({
      page,
      request,
    }) => {
      await page.goto(`/menu/${NASGOR.slug}`);
      await page
        .getByRole("button", { name: "Tambah", exact: true })
        .first()
        .click();
      await page.getByRole("link", { name: /item/i }).click();
      await page.getByLabel("Nama").fill("Pembeli API");
      await page.getByRole("button", { name: /Buat Pesanan/ }).click();
      await expect(page).toHaveURL(/\/pesanan\/[0-9a-f-]+$/);
      orderId = page.url().split("/").pop() as string;

      const queue = await request.get(`${API}/orders`, {
        headers: bearer(token),
      });
      expect(queue.status()).toBe(200);
      const waiting = (await queue.json()).data.orders.find(
        (o: { id: string }) => o.id === orderId,
      );
      expect(waiting.status).toBe("menunggu_pembayaran");

      // Belum lunas → struk belum tersedia.
      const early = await request.get(`${API}/orders/${orderId}/receipt`, {
        headers: bearer(token),
      });
      expect(early.ok()).toBe(false);

      const markPaid = await request.post(
        `${API}/orders/${orderId}/mark-paid`,
        { headers: bearer(token) },
      );
      expect(markPaid.status()).toBe(200);

      const markPaidAgain = await request.post(
        `${API}/orders/${orderId}/mark-paid`,
        { headers: bearer(token) },
      );
      expect(markPaidAgain.ok()).toBe(false);

      const invalidStatus = await request.post(
        `${API}/orders/${orderId}/status`,
        { data: { status: "terbang" }, headers: bearer(token) },
      );
      expect(invalidStatus.status()).toBe(422);

      for (const status of ["diproses", "siap_diambil", "selesai"]) {
        const res = await request.post(`${API}/orders/${orderId}/status`, {
          data: { status },
          headers: bearer(token),
        });
        expect(res.status(), status).toBe(200);
      }

      const receipt = await request.get(`${API}/orders/${orderId}/receipt`, {
        headers: bearer(token),
      });
      expect(receipt.status()).toBe(200);
      expect((await receipt.json()).data.receipt.buyerName).toBe("Pembeli API");

      const history = await request.get(`${API}/orders/history`, {
        headers: bearer(token),
      });
      const ids = (await history.json()).data.orders.map(
        (o: { id: string }) => o.id,
      );
      expect(ids).toContain(orderId);
    });

    test("Pedagang lain tidak bisa melihat atau mengubah Pesanan ini", async ({
      request,
    }) => {
      const other = bearer(otherToken);

      // Ditolak tanpa membocorkan data (pesan bisa "tidak ditemukan" atau "belum lunas").
      const receipt = await request.get(`${API}/orders/${orderId}/receipt`, {
        headers: other,
      });
      expect([400, 404]).toContain(receipt.status());
      expect((await receipt.json()).ok).toBe(false);

      const status = await request.post(`${API}/orders/${orderId}/status`, {
        data: { status: "dibatalkan" },
        headers: other,
      });
      expect([400, 404]).toContain(status.status());

      const queue = await request.get(`${API}/orders`, { headers: other });
      const ids = (await queue.json()).data.orders.map(
        (o: { id: string }) => o.id,
      );
      expect(ids).not.toContain(orderId);
    });

    test("Item, varian, foto, dan buka/tutup Lapak lewat API", async ({
      request,
    }) => {
      const auth = bearer(token);

      const photo = await request.post(`${API}/products/photo`, {
        headers: auth,
        multipart: {
          file: {
            name: "item.png",
            mimeType: "image/png",
            buffer: await readFile(PHOTO_FIXTURE),
          },
        },
      });
      expect(photo.status()).toBe(200);
      const photoUrl = (await photo.json()).data.url as string;
      expect(photoUrl).toMatch(/^\/uploads\/products\//);

      const invalid = await request.post(`${API}/products`, {
        data: { name: "", price: -1 },
        headers: auth,
      });
      expect(invalid.status()).toBe(400);

      const created = await request.post(`${API}/products`, {
        data: { name: "Es Teh API", price: 5000, stock: 10, photoUrl },
        headers: auth,
      });
      expect(created.status()).toBe(200);
      const productId = (await created.json()).data.productId as string;

      const updated = await request.patch(`${API}/products/${productId}`, {
        data: { name: "Es Teh Manis API", price: 6000, stock: 8, photoUrl },
        headers: auth,
      });
      expect(updated.status()).toBe(200);

      const variants = await request.put(
        `${API}/products/${productId}/variants`,
        {
          data: {
            groups: [
              {
                name: "Ukuran",
                options: [
                  { name: "Biasa" },
                  { name: "Jumbo", priceDelta: 2000 },
                ],
              },
            ],
          },
          headers: auth,
        },
      );
      expect(variants.status()).toBe(200);
      const groups = await request.get(
        `${API}/products/${productId}/variants`,
        { headers: auth },
      );
      expect((await groups.json()).data.groups).toHaveLength(1);

      const soldOut = await request.post(
        `${API}/products/${productId}/status`,
        { data: { status: "sold_out" }, headers: auth },
      );
      expect(soldOut.status()).toBe(200);

      const list = await request.get(`${API}/products`, { headers: auth });
      const item = (await list.json()).data.products.find(
        (p: { id: string }) => p.id === productId,
      );
      expect(item).toMatchObject({ name: "Es Teh Manis API", price: 6000 });

      // Pedagang lain tidak bisa mengubah Item ini.
      const foreign = await request.patch(`${API}/products/${productId}`, {
        data: { name: "Dibajak", price: 1 },
        headers: bearer(otherToken),
      });
      expect(foreign.ok()).toBe(false);

      const closed = await request.post(`${API}/open-status`, {
        data: { state: "closed" },
        headers: auth,
      });
      expect(closed.status()).toBe(200);
      const status = await request.get(`${API}/open-status`, {
        headers: auth,
      });
      expect((await status.json()).data.isOpen).toBe(false);
      await request.post(`${API}/open-status`, {
        data: { state: "open" },
        headers: auth,
      });

      const hours = await request.put(`${API}/operating-hours`, {
        data: {
          hours: [{ dayOfWeek: 1, openTime: "08:00", closeTime: "17:00" }],
        },
        headers: auth,
      });
      expect(hours.status()).toBe(200);
    });

    test("endpoint baca profil, laporan, ulasan, tagihan, event", async ({
      request,
    }) => {
      const auth = bearer(token);
      for (const path of [
        "/profile",
        "/delivery-settings",
        "/payment-settings",
        "/qr-menu",
        "/reports/sales?period=7_hari",
        "/reviews",
        "/service-fee-invoices",
        "/events",
      ]) {
        const res = await request.get(`${API}${path}`, { headers: auth });
        expect(res.status(), path).toBe(200);
        expect((await res.json()).ok, path).toBe(true);
      }

      const badPeriod = await request.get(`${API}/reports/sales?period=abad`, {
        headers: auth,
      });
      expect(badPeriod.status()).toBe(422);
    });

    test("cookie login web saja ditolak API mobile", async ({ page }) => {
      // IP tiruan sendiri: budget login per IP browser dipakai spec lain.
      await page.setExtraHTTPHeaders({ "cf-connecting-ip": "10.12.0.6" });
      await page.goto("/login");
      await page.getByLabel("Nomor HP").fill(newPhone);
      await page.getByLabel("Password").fill(NEW_PASSWORD);
      await page.getByRole("button", { name: "Masuk" }).click();
      await expect(page).toHaveURL(/\/dashboard/);

      const res = await page.request.get(`${API}/me`);
      expect(res.status()).toBe(401);
    });

    test("logout mencabut token", async ({ request }) => {
      const res = await request.post(`${API}/auth/logout`, {
        headers: bearer(token),
      });
      expect(res.status()).toBe(200);

      const me = await request.get(`${API}/me`, { headers: bearer(token) });
      expect(me.status()).toBe(401);
    });
  });
