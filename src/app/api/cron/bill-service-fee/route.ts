import { verifyCronSecret } from "@/lib/auth/cron";
import { runWeeklyServiceFeeBilling } from "@/lib/billing/service-fee";

/**
 * Job tagihan mingguan Biaya Layanan Lapak `qris_pribadi` — dipanggil
 * Scheduled Job Dokploy (mingguan), bukan worker/proses terpisah (konsisten
 * dengan asumsi single-instance yang sama dipakai migrasi otomatis &
 * rate-limiter in-memory). Lihat docs/ARSITEKTUR-SISTEM.md.
 */
export async function POST(request: Request): Promise<Response> {
  if (!verifyCronSecret(request)) {
    return new Response("unauthorized", { status: 401 });
  }

  const result = await runWeeklyServiceFeeBilling();
  return Response.json({ ok: true, ...result });
}
