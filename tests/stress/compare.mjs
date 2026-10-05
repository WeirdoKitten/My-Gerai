// Pengukuran ringkas 5 skenario kunci (CCU 50) untuk membandingkan sebelum/sesudah
// perbaikan. Pakai: STRESS_LABEL=with-index node tests/stress/compare.mjs
import { writeFileSync } from "node:fs";
import postgres from "postgres";
import {
  callAction,
  httpGet,
  loadActionIds,
  nextFakeIp,
  runLoad,
} from "./lib.mjs";

const sql = postgres(process.env.DATABASE_URL, { max: 2 });
const A = loadActionIds();
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
const out = [];
const run = async (o) => {
  const r = await runLoad({ durationMs: 20000, ...o });
  out.push(r);
  console.log(
    `[${r.name}] CCU=${r.concurrency} rps=${r.rps} p50=${r.p50} p95=${r.p95} err=${r.errorRate}%`,
  );
};
await run({
  name: "status-pesanan GET",
  concurrency: 50,
  task: () => httpGet(`/pesanan/${sample.id}`),
});
await run({
  name: "createOrder",
  concurrency: 50,
  task: async (vu) => {
    const s = slugs[vu % slugs.length];
    const r = await callAction(
      A.createOrder,
      [
        {
          merchantSlug: s,
          buyerName: "Idx",
          fulfillmentMethod: "ambil_sendiri",
          items: prod.get(s).map((id) => ({ productId: id, qty: 1 })),
        },
      ],
      { page: "/checkout", ip: nextFakeIp() },
    );
    return r?.ok === true;
  },
});
await run({
  name: "listMerchantOrders Lapak ramai",
  concurrency: 50,
  task: async () =>
    Array.isArray(
      (
        await callAction(A.listMerchantOrders, [], {
          page: "/dashboard",
          cookie: "mygerai_session=stress-token-stress-hot",
        })
      )?.orders,
    ),
});
await run({
  name: "200 Lapak polling dashboard tiap 5 dtk",
  concurrency: all.length,
  thinkMs: 5000,
  durationMs: 40000,
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
  name: "laporan 7_hari",
  concurrency: 10,
  task: () =>
    httpGet("/dashboard/laporan?periode=7_hari", {
      cookie: "mygerai_session=stress-token-stress-hot",
    }),
});
writeFileSync(
  `tests/stress/results/${process.env.STRESS_LABEL ?? "compare"}.json`,
  JSON.stringify(out, null, 2),
);
await sql.end();
