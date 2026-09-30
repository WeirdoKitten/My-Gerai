import { NextResponse } from "next/server";
import { revalidateStall } from "@/lib/cache/stall";

/**
 * Seam khusus E2E — HANYA aktif saat env `ALLOW_TEST_HOOKS=1` (di-set
 * playwright.config webServer.env; 404 di dev/produksi). Memicu invalidasi
 * cache katalog yang SAMA dengan yang dilakukan server action Pedagang
 * (saveProductVariantGroups dll), supaya spec yang menyuntik fixture lewat
 * SQL mentah (bypass server action) tetap melihat menu yang segar — meniru
 * perilaku produksi, bukan melonggarkannya.
 */
const ENABLED = process.env.ALLOW_TEST_HOOKS === "1";

export async function POST(request: Request) {
  if (!ENABLED) return new NextResponse("Not found", { status: 404 });
  const { slug } = (await request.json().catch(() => ({}))) as { slug?: string };
  if (!slug) return NextResponse.json({ ok: false }, { status: 400 });
  revalidateStall(slug);
  return NextResponse.json({ ok: true });
}
