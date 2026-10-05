// Skenario stress test MyGerai. Jalankan terhadap server PRODUKSI lokal
// (`next build` + `next start`), BUKAN `next dev`. Lihat docs/STRESS-TEST.md.
//
//   node tests/stress/run.mjs <skenario> [<skenario> ...]
//   node tests/stress/run.mjs all
//
// Env: DATABASE_URL (DB yang sama dengan server), STRESS_BASE_URL
// (default http://127.0.0.1:3200), STRESS_SERVER_PORT (default 3200),
// CRON_SECRET (untuk skenario `billing`), STRESS_QUICK=1 (durasi pendek).

import { mkdirSync, writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import postgres from "postgres";
import {
  BASE_URL,
  callAction,
  findPidByPort,
  httpGet,
  loadActionIds,
  nextFakeIp,
  runLoad,
  startSampler,
} from "./lib.mjs";

const url = process.env.DATABASE_URL ?? "";
if (!url.includes("localhost") && !url.includes("127.0.0.1")) {
  throw new Error("Stress test hanya untuk database lokal.");
}
const dbName = new URL(url).pathname.slice(1);
const sql = postgres(url, { max: 4, onnotice: () => {} });
const QUICK = process.env.STRESS_QUICK === "1";
const STEP_MS = QUICK ? 8_000 : 20_000;

const A = loadActionIds();
const pid = await findPidByPort(Number(process.env.STRESS_SERVER_PORT ?? 3200));
const results = {};
mkdirSync("tests/stress/results", { recursive: true });

const merchantCookie = (slug) => `mygerai_session=stress-token-${slug}`;
const adminCookie = "mygerai_admin_session=stress-admin-token";

async function productsOf(slug) {
  return sql`SELECT p.id, p.stock FROM products p JOIN merchants m ON m.id = p.merchant_id
             WHERE m.slug = ${slug} ORDER BY p.name`;
}

const merchantSlugs = (
  await sql`SELECT slug FROM merchants WHERE slug LIKE 'stress-%' ORDER BY slug`
).map((r) => r.slug);
const gatewaySlugs = merchantSlugs.filter(
  (s) => !s.startsWith("stress-qris") && s !== "stress-stok",
);
const productCache = new Map();
for (const slug of merchantSlugs)
  productCache.set(slug, await productsOf(slug));

function orderInput(slug, { items = 2, delivery = false } = {}) {
  const products = productCache.get(slug);
  const input = {
    merchantSlug: slug,
    buyerName: `Pembeli Stress ${Math.floor(Math.random() * 1e6)}`,
    fulfillmentMethod: delivery ? "antar" : "ambil_sendiri",
    items: products
      .slice(0, items)
      .map((p, i) => ({ productId: p.id, qty: 1 + (i % 3) })),
  };
  if (delivery) {
    Object.assign(input, {
      buyerPhone: "081234567890",
      deliveryAddress: "Jl. Uji Beban No. 1",
      deliveryLatitude: -6.2005,
      deliveryLongitude: 106.8005,
    });
  }
  return input;
}

async function createOrder(input, ip = nextFakeIp()) {
  return callAction(A.createOrder, [input], { page: "/checkout", ip });
}

/** Jalankan satu langkah beban + sampler sumber daya, simpan & cetak hasil. */
async function measured(group, opts) {
  const stop = startSampler({ pid, sql, dbName });
  const summary = await runLoad(opts);
  summary.resources = await stop();
  results[group] ??= [];
  results[group].push(summary);
  const r = summary.resources ?? {};
  console.log(
    `  [${summary.name}] CCU=${summary.concurrency} req=${summary.requests} rps=${summary.rps} ` +
      `p50=${summary.p50} p95=${summary.p95} p99=${summary.p99} max=${summary.max}ms ` +
      `err=${summary.errorRate}% ${JSON.stringify(summary.errors)} cpu=${r.cpuCoresMax} ram=${r.rssMbMax}MB db=${r.dbConnMax}`,
  );
  return summary;
}

function save(name) {
  writeFileSync(
    `tests/stress/results/${name}.json`,
    JSON.stringify(results[name] ?? {}, null, 2),
  );
}

// ---------------------------------------------------------------------------

const scenarios = {
  /** Halaman publik Pembeli (GET) pada CCU bertingkat. */
  async pages() {
    const [sample] =
      await sql`SELECT o.id FROM orders o JOIN merchants m ON m.id = o.merchant_id
                               WHERE m.slug = 'stress-hot' AND o.status = 'selesai' LIMIT 1`;
    const targets = [
      ["menu", "/menu/stress-hot"],
      ["status-pesanan", `/pesanan/${sample.id}`],
      ["landing", "/"],
      ["lacak", "/lacak"],
    ];
    for (const [name, path] of targets) {
      for (const ccu of [10, 50, 100, 250, 500, 1000, 2000]) {
        await measured("pages", {
          name,
          concurrency: ccu,
          durationMs: STEP_MS,
          task: () => httpGet(path),
        });
      }
    }
    save("pages");
  },

  /** Brute force pembuatan Pesanan (tiap request = Pembeli beda IP) pada CCU bertingkat. */
  async create() {
    for (const ccu of [10, 50, 100, 250, 500, 1000, 2000]) {
      await measured("create", {
        name: "createOrder",
        concurrency: ccu,
        durationMs: STEP_MS,
        task: async (vu) => {
          const slug = gatewaySlugs[vu % gatewaySlugs.length];
          const result = await createOrder(
            orderInput(slug, { items: 2, delivery: vu % 4 === 0 }),
          );
          return result?.ok === true;
        },
      });
    }
    save("create");
  },

  /** Volume besar: puluhan ribu Pesanan ke SATU Lapak ramai (stress-hot) dengan CCU tetap. */
  async bulk() {
    const total = QUICK ? 5_000 : 30_000;
    await measured("bulk", {
      name: `createOrder x${total} ke stress-hot`,
      concurrency: 200,
      totalRequests: total,
      task: async () =>
        (await createOrder(orderInput("stress-hot", { items: 3 })))?.ok ===
        true,
    });
    save("bulk");
  },

  /** Alur Pembeli lengkap: buat Pesanan → cek status → bayar (mock) → cek status. */
  async flow() {
    for (const ccu of [50, 200, 500, 1000]) {
      await measured("flow", {
        name: "alur penuh (4 panggilan)",
        concurrency: ccu,
        durationMs: STEP_MS,
        task: async (vu) => {
          const slug = gatewaySlugs[vu % gatewaySlugs.length];
          const created = await createOrder(orderInput(slug));
          if (!created?.ok) return false;
          await callAction(A.getOrderStatus, [created.orderId], {
            page: `/pesanan/${created.orderId}`,
          });
          const paid = await callAction(
            A.simulatePaymentSuccess,
            [created.orderId],
            { page: `/pesanan/${created.orderId}` },
          );
          if (!paid?.ok) return false;
          const status = await callAction(A.getOrderStatus, [created.orderId], {
            page: `/pesanan/${created.orderId}`,
          });
          return status?.status === "dibayar";
        },
      });
    }
    save("flow");
  },

  /**
   * CCU realistis: N Pembeli membuka halaman status Pesanan yang MENUNGGU
   * pembayaran, masing-masing polling `getOrderStatus` tiap 4 dtk (perilaku
   * OrderStatusView.tsx). Tiap poll merender ulang QR jadi data URI.
   */
  async poll() {
    const levels = QUICK ? [500, 2000] : [500, 1000, 2500, 5000, 10000];
    const need = levels.at(-1);
    console.log(`  menyiapkan ${need} Pesanan menunggu pembayaran...`);
    const pending = (
      await sql`SELECT o.id FROM orders o JOIN payments p ON p.order_id = o.id
                WHERE o.status = 'menunggu_pembayaran' AND p.provider = 'mock' AND o.expires_at > now() + interval '10 minutes'
                LIMIT ${need}`
    ).map((r) => r.id);
    while (pending.length < need) {
      const batch = await Promise.all(
        Array.from({ length: Math.min(200, need - pending.length) }, () =>
          createOrder(
            orderInput(gatewaySlugs[pending.length % gatewaySlugs.length]),
          ).catch(() => null),
        ),
      );
      for (const r of batch) if (r?.ok) pending.push(r.orderId);
    }
    for (const ccu of levels) {
      await measured("poll", {
        name: "polling getOrderStatus tiap 4 dtk",
        concurrency: ccu,
        thinkMs: 4000,
        durationMs: QUICK ? 20_000 : 45_000,
        task: async (vu) => {
          const id = pending[vu];
          const s = await callAction(A.getOrderStatus, [id], {
            page: `/pesanan/${id}`,
          });
          return s?.id === id;
        },
      });
    }
    save("poll");
  },

  /** Dashboard Pedagang: Lapak ramai dengan banyak Pesanan aktif + 200 Lapak polling bersamaan. */
  async merchant() {
    // Pastikan stress-hot punya banyak Pesanan aktif (dibayar) — antrean menumpuk.
    await sql`UPDATE orders SET status = 'dibayar', paid_at = now()
              WHERE id IN (SELECT o.id FROM orders o JOIN merchants m ON m.id = o.merchant_id
                           WHERE m.slug = 'stress-hot' AND o.status = 'menunggu_pembayaran' LIMIT 3000)`;
    const [{ active }] =
      await sql`SELECT count(*)::int AS active FROM orders o JOIN merchants m ON m.id = o.merchant_id
                                   WHERE m.slug = 'stress-hot' AND o.status IN ('dibayar','diproses','siap_diambil','sedang_diantar')`;
    console.log(`  Pesanan aktif stress-hot: ${active}`);
    const hot = merchantCookie("stress-hot");
    for (const ccu of [1, 10, 50, 200]) {
      await measured("merchant", {
        name: `listMerchantOrders (Lapak ramai, ${active} aktif)`,
        concurrency: ccu,
        durationMs: STEP_MS,
        task: async () =>
          Array.isArray(
            (
              await callAction(A.listMerchantOrders, [], {
                page: "/dashboard",
                cookie: hot,
              })
            )?.orders,
          ),
      });
    }
    await measured("merchant", {
      name: `${merchantSlugs.length} Lapak polling dashboard tiap 5 dtk`,
      concurrency: merchantSlugs.length,
      thinkMs: 5000,
      durationMs: 40_000,
      task: async (vu) =>
        Array.isArray(
          (
            await callAction(A.listMerchantOrders, [], {
              page: "/dashboard",
              cookie: merchantCookie(merchantSlugs[vu]),
            })
          )?.orders,
        ),
    });
    save("merchant");
  },

  /** Halaman berat (data historis besar): Riwayat, Laporan, dashboard, Admin. */
  async heavy() {
    const hot = merchantCookie("stress-hot");
    const targets = [
      ["dashboard Pedagang", "/dashboard", hot],
      ["riwayat Pedagang", "/dashboard/riwayat", hot],
      ["laporan hari_ini", "/dashboard/laporan?periode=hari_ini", hot],
      ["laporan 7_hari", "/dashboard/laporan?periode=7_hari", hot],
      ["laporan 30_hari", "/dashboard/laporan?periode=30_hari", hot],
      ["admin payouts (semua Pesanan)", "/admin/payouts", adminCookie],
      ["admin merchants", "/admin/merchants", adminCookie],
      ["admin invoices", "/admin/invoices", adminCookie],
    ];
    for (const [name, path, cookie] of targets) {
      // Latensi tunggal (tanpa beban lain), lalu 10 & 50 CCU.
      await measured("heavy", {
        name: `${name} (sekuensial)`,
        concurrency: 1,
        totalRequests: 5,
        task: () => httpGet(path, { cookie }),
      });
      for (const ccu of [10, 50]) {
        await measured("heavy", {
          name,
          concurrency: ccu,
          durationMs: QUICK ? 8_000 : 15_000,
          task: () => httpGet(path, { cookie }),
        });
      }
    }
    save("heavy");
  },

  /** Race stok: 300 Pembeli bersamaan membeli Item stok 50 lalu semua membayar. */
  async stock() {
    const [item] = await productsOf("stress-stok");
    await sql`UPDATE products SET stock = 50 WHERE id = ${item.id}`;
    await sql`UPDATE orders SET status = 'dibatalkan' WHERE merchant_id = (SELECT id FROM merchants WHERE slug = 'stress-stok')`;
    const input = {
      merchantSlug: "stress-stok",
      buyerName: "Race",
      fulfillmentMethod: "ambil_sendiri",
      items: [{ productId: item.id, qty: 1 }],
    };
    const created = await Promise.all(
      Array.from({ length: 300 }, () => createOrder(input)),
    );
    const ids = created.filter((r) => r?.ok).map((r) => r.orderId);
    const paid = await Promise.all(
      ids.map((id) =>
        callAction(A.simulatePaymentSuccess, [id], {
          page: `/pesanan/${id}`,
        }).catch(() => null),
      ),
    );
    const [{ stock }] =
      await sql`SELECT stock FROM products WHERE id = ${item.id}`;
    const [{ sold }] =
      await sql`SELECT coalesce(sum(oi.qty),0)::int AS sold FROM order_items oi JOIN orders o ON o.id = oi.order_id
                                 WHERE oi.product_id = ${item.id} AND o.status = 'dibayar'`;
    results.stock = {
      stockAwal: 50,
      pesananDibuat: ids.length,
      pembayaranSukses: paid.filter((p) => p?.ok).length,
      itemTerjualDibayar: sold,
      stokAkhir: stock,
      oversell: Math.max(0, sold - 50),
    };
    console.log("  ", results.stock);
    save("stock");
  },

  /** Rate-limit per IP: 30 Pesanan dari 1 IP (batas 20/10 menit) + 30 Lacak (batas 10). */
  async ratelimit() {
    const ip = "203.0.113.77";
    const orders = [];
    for (let i = 0; i < 30; i++)
      orders.push(await createOrder(orderInput("stress-lapak-030"), ip));
    const tracks = [];
    for (let i = 0; i < 30; i++)
      tracks.push(
        await callAction(A.findOrderForTracking, ["ZZZZZZZZ"], {
          page: "/lacak",
          ip,
        }),
      );
    results.ratelimit = {
      createOrderLolos: orders.filter((r) => r?.ok).length,
      createOrderDitolak: orders.filter((r) => r && !r.ok).length,
      lacakDitolakRateLimit: tracks.filter((r) =>
        r?.message?.startsWith("Terlalu banyak"),
      ).length,
    };
    console.log("  ", results.ratelimit);
    save("ratelimit");
  },

  /** Payload besar: `items` tanpa batas maksimum di createOrderSchema. */
  async payload() {
    const [p] = productCache.get("stress-lapak-040");
    const out = [];
    for (const n of [10, 100, 1000, 5000, 20000]) {
      const input = {
        ...orderInput("stress-lapak-040", { items: 1 }),
        items: Array.from({ length: n }, () => ({ productId: p.id, qty: 1 })),
      };
      const t0 = performance.now();
      let res;
      try {
        res = await createOrder(input);
      } catch (error) {
        res = { error: error.message };
      }
      const ms = Math.round(performance.now() - t0);
      const bytes = JSON.stringify([input]).length;
      out.push({
        items: n,
        bodyKb: Math.round(bytes / 1024),
        ms,
        result: res?.ok ?? res?.message ?? res?.error,
      });
      console.log("  ", out.at(-1));
    }
    results.payload = out;
    save("payload");
  },

  /** Job tagihan mingguan Biaya Layanan atas data historis besar. */
  async billing() {
    const secret = process.env.CRON_SECRET;
    if (!secret) return console.log("  dilewati: CRON_SECRET kosong");
    await sql`DELETE FROM service_fee_invoices WHERE merchant_id IN (SELECT id FROM merchants WHERE slug LIKE 'stress-%')`;
    const runs = [];
    for (let i = 0; i < 2; i++) {
      const t0 = performance.now();
      const res = await fetch(`${BASE_URL}/api/cron/bill-service-fee`, {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}` },
      });
      runs.push({
        run: i + 1,
        status: res.status,
        ms: Math.round(performance.now() - t0),
        body: await res.json().catch(() => null),
      });
      console.log("  ", runs.at(-1));
    }
    results.billing = runs;
    save("billing");
  },

  /** Beban campuran ±5 menit (pantau kebocoran memori & kestabilan). */
  async soak() {
    const durationMs = QUICK ? 60_000 : 300_000;
    // Pesanan menunggu yang masih segar (belum kedaluwarsa) supaya QR ikut dirender tiap poll.
    const pending = [];
    while (pending.length < 1000) {
      const batch = await Promise.all(
        Array.from({ length: 100 }, () =>
          createOrder(
            orderInput(gatewaySlugs[pending.length % gatewaySlugs.length]),
          ).catch(() => null),
        ),
      );
      for (const r of batch) if (r?.ok) pending.push(r.orderId);
    }
    const stop = startSampler({ pid, sql, dbName, intervalMs: 5000 });
    const [buyers, creators, merchants, menus] = await Promise.all([
      runLoad({
        name: "soak: 1000 Pembeli polling status",
        concurrency: pending.length,
        thinkMs: 4000,
        durationMs,
        task: async (vu) =>
          (
            await callAction(A.getOrderStatus, [pending[vu]], {
              page: `/pesanan/${pending[vu]}`,
            })
          )?.id === pending[vu],
      }),
      runLoad({
        name: "soak: Pesanan baru (~25/dtk)",
        concurrency: 25,
        thinkMs: 1000,
        durationMs,
        task: async (vu) =>
          (
            await createOrder(
              orderInput(gatewaySlugs[vu % gatewaySlugs.length]),
            )
          )?.ok === true,
      }),
      runLoad({
        name: "soak: 200 Lapak polling dashboard",
        concurrency: merchantSlugs.length,
        thinkMs: 5000,
        durationMs,
        task: async (vu) =>
          Array.isArray(
            (
              await callAction(A.listMerchantOrders, [], {
                page: "/dashboard",
                cookie: merchantCookie(merchantSlugs[vu]),
              })
            )?.orders,
          ),
      }),
      runLoad({
        name: "soak: buka menu (~50/dtk)",
        concurrency: 50,
        thinkMs: 1000,
        durationMs,
        task: (vu) =>
          httpGet(`/menu/${gatewaySlugs[vu % gatewaySlugs.length]}`),
      }),
    ]);
    const resources = await stop();
    results.soak = { resources, parts: [buyers, creators, merchants, menus] };
    for (const p of results.soak.parts) {
      console.log(
        `  [${p.name}] req=${p.requests} rps=${p.rps} p50=${p.p50} p95=${p.p95} p99=${p.p99} err=${p.errorRate}% ${JSON.stringify(p.errors)}`,
      );
    }
    console.log("  sumber daya:", resources);
    save("soak");
  },
};

// ---------------------------------------------------------------------------

const ORDER = [
  "pages",
  "create",
  "bulk",
  "flow",
  "poll",
  "merchant",
  "heavy",
  "stock",
  "ratelimit",
  "payload",
  "billing",
  "soak",
];
const requested = process.argv.slice(2);
const toRun = requested.includes("all") ? ORDER : requested;
if (toRun.length === 0) {
  console.log(`Skenario: ${ORDER.join(", ")}, all`);
  process.exit(0);
}
console.log(`Server: ${BASE_URL} (PID ${pid ?? "?"}), DB: ${dbName}`);
for (const name of toRun) {
  if (!scenarios[name]) throw new Error(`Skenario tidak dikenal: ${name}`);
  console.log(`\n== ${name} ==`);
  await scenarios[name]();
  await sleep(3000); // jeda agar server tenang di antara skenario
}
await sql.end();
