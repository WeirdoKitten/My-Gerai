// Utilitas stress test tanpa dependency tambahan: runner beban "closed-loop"
// (N pengguna virtual bersamaan = CCU), pemanggil Server Action via HTTP,
// dan sampler sumber daya (CPU/RAM proses server + koneksi Postgres).

import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

export const BASE_URL = process.env.STRESS_BASE_URL ?? "http://127.0.0.1:3200";

// Koneksi keep-alive tanpa batas socket (tiap pengguna virtual = 1 koneksi).
const agent = new http.Agent({
  keepAlive: true,
  maxSockets: Number.POSITIVE_INFINITY,
});

/** Request HTTP mentah (node:http), timeout 60 dtk. Mengembalikan status + body. */
function request(method, urlPath, headers, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      BASE_URL + urlPath,
      {
        method,
        headers,
        agent,
        timeout: Number(process.env.STRESS_REQUEST_TIMEOUT_MS ?? 60_000),
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({ status: res.statusCode, body: Buffer.concat(chunks) }),
        );
        res.on("error", reject);
      },
    );
    req.on("timeout", () =>
      req.destroy(Object.assign(new Error("timeout"), { code: "TIMEOUT" })),
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

/** ID Server Action dari manifest build (`<STRESS_NEXT_DIR atau .next>/server/server-reference-manifest.json`). */
export function loadActionIds() {
  const manifest = JSON.parse(
    readFileSync(
      path.resolve(
        process.env.STRESS_NEXT_DIR ?? ".next",
        "server/server-reference-manifest.json",
      ),
      "utf8",
    ),
  );
  const ids = {};
  for (const [id, entry] of Object.entries(manifest.node))
    ids[entry.exportedName] = id;
  return ids;
}

let ipCounter = 0;
/** IP palsu unik per Pembeli virtual (rate-limit per IP, lokal tanpa Cloudflare memakai x-forwarded-for). */
export function nextFakeIp() {
  ipCounter++;
  return `10.${(ipCounter >> 16) & 255}.${(ipCounter >> 8) & 255}.${ipCounter & 255}`;
}

/**
 * Panggil Server Action seperti browser: POST ke halaman, header `Next-Action`,
 * body = array argumen JSON. Respons RSC baris `1:` berisi nilai kembalian.
 */
export async function callAction(
  actionId,
  args,
  { page = "/", ip, cookie } = {},
) {
  const headers = {
    "Next-Action": actionId,
    "Content-Type": "text/plain;charset=UTF-8",
    Accept: "text/x-component",
    Origin: BASE_URL,
  };
  if (ip) headers["x-forwarded-for"] = ip;
  if (cookie) headers.Cookie = cookie;
  const res = await request("POST", page, headers, JSON.stringify(args));
  const text = res.body.toString("utf8");
  if (res.status !== 200) {
    const error = new Error(`HTTP ${res.status}`);
    error.status = res.status;
    throw error;
  }
  // Baris teks RSC (`2:T<len>,...`) tidak diakhiri newline, jadi baris `1:`
  // bisa menempel di belakang data URI QR — cari penandanya di mana pun.
  const match = /1:[{[]/.exec(text);
  if (!match) return null;
  const from = match.index + 2;
  const end = text.indexOf("\n", from);
  return JSON.parse(text.slice(from, end === -1 ? undefined : end));
}

export async function httpGet(urlPath, { cookie } = {}) {
  const res = await request("GET", urlPath, cookie ? { Cookie: cookie } : {});
  if (res.status >= 400) {
    const error = new Error(`HTTP ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return { status: res.status, bytes: res.body.byteLength };
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  return sorted[
    Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  ];
}

/**
 * Jalankan beban closed-loop: `concurrency` pengguna virtual masing-masing
 * memanggil `task(vu, iteration)` berulang sampai `durationMs` habis atau
 * total `totalRequests` tercapai. `thinkMs` = jeda antar request per pengguna
 * (mis. 4000 untuk meniru polling halaman status Pembeli).
 * `task` boleh mengembalikan `false` untuk menandai gagal secara logika (ok:false).
 */
export async function runLoad({
  name,
  concurrency,
  durationMs,
  totalRequests,
  thinkMs = 0,
  rampMs = 0,
  task,
}) {
  const latencies = [];
  const errors = new Map();
  let ok = 0;
  let failed = 0;
  let issued = 0;
  const started = performance.now();
  const deadline = durationMs ? started + durationMs : Number.POSITIVE_INFINITY;

  async function vu(id) {
    if (rampMs) await sleep((rampMs * id) / concurrency);
    else if (thinkMs) await sleep(Math.random() * thinkMs); // sebar fase polling
    let iteration = 0;
    while (performance.now() < deadline) {
      if (totalRequests && issued >= totalRequests) return;
      issued++;
      const t0 = performance.now();
      try {
        const result = await task(id, iteration++);
        latencies.push(performance.now() - t0);
        if (result === false) {
          failed++;
          errors.set("logical-fail", (errors.get("logical-fail") ?? 0) + 1);
        } else ok++;
      } catch (error) {
        latencies.push(performance.now() - t0);
        failed++;
        const key = error.status
          ? `HTTP ${error.status}`
          : (error.code ?? error.message).slice(0, 80);
        errors.set(key, (errors.get(key) ?? 0) + 1);
      }
      if (thinkMs) await sleep(thinkMs);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, (_, i) => vu(i)));
  const elapsed = (performance.now() - started) / 1000;
  latencies.sort((a, b) => a - b);
  const total = ok + failed;
  const summary = {
    name,
    concurrency,
    thinkMs,
    requests: total,
    ok,
    failed,
    errorRate: total ? +((failed / total) * 100).toFixed(2) : 0,
    rps: +(total / elapsed).toFixed(1),
    durationS: +elapsed.toFixed(1),
    p50: Math.round(percentile(latencies, 50)),
    p90: Math.round(percentile(latencies, 90)),
    p95: Math.round(percentile(latencies, 95)),
    p99: Math.round(percentile(latencies, 99)),
    max: Math.round(latencies.at(-1) ?? 0),
    errors: Object.fromEntries(errors),
  };
  return summary;
}

/** PID proses yang LISTEN di port tertentu (Windows `netstat -ano`). */
export async function findPidByPort(port) {
  const out = await new Promise((resolve, reject) =>
    execFile("netstat", ["-ano", "-p", "TCP"], (err, stdout) =>
      err ? reject(err) : resolve(stdout),
    ),
  );
  const line = out
    .split("\n")
    .find((l) => l.includes(`:${port} `) && l.includes("LISTENING"));
  return line ? Number(line.trim().split(/\s+/).at(-1)) : null;
}

function processStats(pid) {
  return new Promise((resolve) =>
    execFile(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `$p=Get-Process -Id ${pid}; "$($p.CPU) $($p.WorkingSet64)"`,
      ],
      (err, stdout) => {
        if (err) return resolve(null);
        const [cpu, ws] = stdout.trim().split(" ").map(Number);
        resolve({ cpu, ws });
      },
    ),
  );
}

/**
 * Sampler tiap `intervalMs`: CPU server (dalam satuan core, 1.0 = 1 core penuh),
 * RAM (working set MB), dan jumlah koneksi Postgres ke DB uji.
 */
export function startSampler({ pid, sql, dbName, intervalMs = 2000 }) {
  const samples = [];
  let prev = null;
  let stopped = false;
  const loop = (async () => {
    while (!stopped) {
      const t = performance.now();
      const [ps, conn] = await Promise.all([
        pid ? processStats(pid) : null,
        sql`SELECT count(*)::int AS total, count(*) FILTER (WHERE state = 'active')::int AS active
            FROM pg_stat_activity WHERE datname = ${dbName}`
          .then((r) => r[0])
          .catch(() => null),
      ]);
      if (ps && prev) {
        samples.push({
          cores: (ps.cpu - prev.cpu) / ((t - prev.t) / 1000),
          rssMb: ps.ws / 1024 / 1024,
          dbConn: conn?.total ?? null,
          dbActive: conn?.active ?? null,
        });
      }
      if (ps) prev = { ...ps, t };
      await sleep(intervalMs);
    }
  })();
  return async function stop() {
    stopped = true;
    await loop;
    if (samples.length === 0) return null;
    const max = (k) => +Math.max(...samples.map((s) => s[k] ?? 0)).toFixed(2);
    const avg = (k) =>
      +(samples.reduce((a, s) => a + (s[k] ?? 0), 0) / samples.length).toFixed(
        2,
      );
    return {
      cpuCoresAvg: avg("cores"),
      cpuCoresMax: max("cores"),
      rssMbMax: Math.round(max("rssMb")),
      dbConnMax: max("dbConn"),
      dbActiveMax: max("dbActive"),
    };
  };
}
