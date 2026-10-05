// Suite A/B ringkas (±6 menit) untuk membandingkan dua versi kode di kondisi
// mesin yang sama. Jalankan bergantian terhadap server versi lama & baru.
//
//   STRESS_LABEL=sesudah node tests/stress/compare.mjs
//
// Env: DATABASE_URL, STRESS_BASE_URL, STRESS_NEXT_DIR (folder `.next` milik
// server yang diuji, default `.next`), STRESS_SKIP_ADMIN=1 (lewati
// /admin/payouts yang di versi lama bisa membuat server kehabisan memori).

import { writeFileSync } from "node:fs";
import postgres from "postgres";
import {
  callAction,
  httpGet,
  loadActionIds,
  nextFakeIp,
  runLoad,
} from "./lib.mjs";

const sql = postgres(process.env.DATABASE_URL, { max: 2, onnotice: () => {} });
const A = loadActionIds();
const STEP_MS = 20_000;

const [sample] =
  await sql`SELECT o.id FROM orders o JOIN merchants m ON m.id=o.merchant_id WHERE m.slug='stress-hot' AND o.status='selesai' LIMIT 1`;
const slugs = (
  await sql`SELECT slug FROM merchants WHERE slug LIKE 'stress-lapak-%' ORDER BY slug`
).map((r) => r.slug);
const all = (
  await sql`SELECT slug FROM merchants WHERE slug LIKE 'stress-%' ORDER BY slug`
).map((r) => r.slug);
const prod = new Map();
for (const s of slugs)
  prod.set(
    s,
    (
      await sql`SELECT p.id FROM products p JOIN merchants m ON m.id=p.merchant_id WHERE m.slug=${s} ORDER BY p.name LIMIT 2`
    ).map((r) => r.id),
  );

const createOrder = (vu) => {
  const s = slugs[vu % slugs.length];
  return callAction(
    A.createOrder,
    [
      {
        merchantSlug: s,
        buyerName: "AB",
        fulfillmentMethod: "ambil_sendiri",
        items: prod.get(s).map((id) => ({ productId: id, qty: 1 })),
      },
    ],
    { page: "/checkout", ip: nextFakeIp() },
  );
};
const hotCookie = "mygerai_session=stress-token-stress-hot";

const out = [];
const run = async (o) => {
  const r = await runLoad({ durationMs: STEP_MS, ...o });
  out.push(r);
  console.log(
    `[${r.name}] CCU=${r.concurrency} rps=${r.rps} p50=${r.p50} p95=${r.p95} err=${r.errorRate}% ${JSON.stringify(r.errors)}`,
  );
};

// Kontrol: halaman statis yang tidak diubah — untuk mendeteksi beda kecepatan mesin.
await run({
  name: "kontrol /lacak (statis)",
  concurrency: 50,
  task: () => httpGet("/lacak"),
});
await run({
  name: "menu GET",
  concurrency: 50,
  task: () => httpGet("/menu/stress-hot"),
});
await run({ name: "landing GET", concurrency: 50, task: () => httpGet("/") });
await run({
  name: "status Pesanan GET",
  concurrency: 50,
  task: () => httpGet(`/pesanan/${sample.id}`),
});
await run({
  name: "createOrder",
  concurrency: 50,
  task: async (vu) => (await createOrder(vu))?.ok === true,
});

// 500 Pembeli menunggu bayar, polling tiap 4 dtk seperti OrderStatusView
// versi masing-masing: versi baru memakai getOrderStatusSummary.
const pending = [];
while (pending.length < 500) {
  const batch = await Promise.all(
    Array.from({ length: 50 }, (_, i) =>
      createOrder(pending.length + i).catch(() => null),
    ),
  );
  for (const r of batch) if (r?.ok) pending.push(r.orderId);
}
const pollAction = A.getOrderStatusSummary ?? A.getOrderStatus;
await run({
  name: `500 Pembeli polling (${A.getOrderStatusSummary ? "ringkas" : "lengkap"})`,
  concurrency: 500,
  thinkMs: 4000,
  durationMs: 40_000,
  task: async (vu) =>
    !!(
      await callAction(pollAction, [pending[vu]], {
        page: `/pesanan/${pending[vu]}`,
      })
    )?.status,
});

await run({
  name: "200 Lapak polling dashboard tiap 5 dtk",
  concurrency: all.length,
  thinkMs: 5000,
  durationMs: 40_000,
  task: async (vu) =>
    Array.isArray(
      (
        await callAction(A.listMerchantOrders, [], {
          page: "/dashboard",
          cookie: `mygerai_session=stress-token-${all[vu]}`,
        })
      )?.orders,
    ),
});
await run({
  name: "dashboard Lapak ramai",
  concurrency: 50,
  task: async () =>
    Array.isArray(
      (
        await callAction(A.listMerchantOrders, [], {
          page: "/dashboard",
          cookie: hotCookie,
        })
      )?.orders,
    ),
});
await run({
  name: "laporan 7_hari",
  concurrency: 10,
  task: () =>
    httpGet("/dashboard/laporan?periode=7_hari", { cookie: hotCookie }),
});

if (process.env.STRESS_SKIP_ADMIN !== "1") {
  await run({
    name: "admin payouts (1 request)",
    concurrency: 1,
    totalRequests: 1,
    durationMs: 180_000,
    task: () =>
      httpGet("/admin/payouts", {
        cookie: "mygerai_admin_session=stress-admin-token",
      }),
  });
}

writeFileSync(
  `tests/stress/results/${process.env.STRESS_LABEL ?? "compare"}.json`,
  JSON.stringify(out, null, 2),
);
await sql.end();
