import QRCode from "qrcode";

/** Path StoreIcon (lucide-style, viewBox 24x24) — dipakai sebagai lambang di tengah QR, sinkron dengan `Wordmark`/`icons.tsx`. */
const STORE_ICON_PATHS = [
  "M4 9V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3",
  "M3 9h18l-1 3.5a2 2 0 0 1-2 1.5 2.3 2.3 0 0 1-2-1.2 2.3 2.3 0 0 1-4 0 2.3 2.3 0 0 1-4 0A2.3 2.3 0 0 1 6 14a2 2 0 0 1-2-1.5Z",
  "M5 14v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6",
];

// Nilai literal dari globals.css (bukan var(--...)) — file SVG hasil unduhan
// berdiri sendiri, tidak ikut membawa stylesheet aplikasi.
const INK = "#1c1917";
const INK_MUTED = "#78716c";
const LINE = "#eae3db";
const BRAND_STRONG = "#c2410c";
const BRAND_TINT = "#fff1e7";
const SURFACE = "#ffffff";

/**
 * Poster QR pendaftaran Pedagang: SVG mandiri (frame + judul + lambang toko
 * di tengah QR + caption), bukan QR polos, supaya tetap menarik saat diunduh
 * & dicetak lepas dari halaman. Logo di tengah aman karena errorCorrectionLevel
 * "H" mentolerir ~30% area tertutup — lingkaran logo di sini cuma ~4%.
 */
export async function buildRegistrationQrPoster(url: string): Promise<string> {
  const qrSvg = await QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 0,
    color: { dark: INK, light: "#00000000" },
  });
  const viewBoxMatch = qrSvg.match(/viewBox="0 0 (\d+) \d+"/);
  const pathMatch = qrSvg.match(/<path[^>]*\sd="([^"]+)"/);
  if (!viewBoxMatch || !pathMatch) {
    throw new Error("Format SVG dari library qrcode berubah — parsing gagal");
  }
  const modules = Number(viewBoxMatch[1]);
  const pathData = pathMatch[1];

  const size = 520;
  const frame = 24;
  const headerHeight = 64;
  const qrCard = 400;
  const qrSize = qrCard - 64;
  const qrCardX = (size - qrCard) / 2;
  const qrCardY = frame + headerHeight + 28;
  const qrX = (size - qrSize) / 2;
  const qrY = qrCardY + (qrCard - qrSize) / 2;
  const scale = qrSize / modules;
  const logoR = 36;
  const logoCx = size / 2;
  const logoCy = qrY + qrSize / 2;
  const height = qrCardY + qrCard + 96;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${height}" viewBox="0 0 ${size} ${height}">
  <defs>
    <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="${BRAND_STRONG}" flood-opacity="0.18" />
    </filter>
  </defs>

  <rect width="${size}" height="${height}" rx="36" fill="${BRAND_TINT}" />
  <rect x="3" y="3" width="${size - 6}" height="${height - 6}" rx="33" fill="none" stroke="${BRAND_STRONG}" stroke-width="3" />

  <rect x="${frame}" y="${frame}" width="${size - frame * 2}" height="${headerHeight}" rx="18" fill="${BRAND_STRONG}" />
  <text x="${size / 2}" y="${frame + headerHeight / 2 + 8}" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="800" fill="${SURFACE}">Daftar Jadi Pedagang</text>

  <rect x="${qrCardX}" y="${qrCardY}" width="${qrCard}" height="${qrCard}" rx="24" fill="${SURFACE}" stroke="${LINE}" stroke-width="2" filter="url(#cardShadow)" />
  <g transform="translate(${qrX} ${qrY}) scale(${scale})" shape-rendering="crispEdges">
    <path stroke="${INK}" d="${pathData}" />
  </g>

  <circle cx="${logoCx}" cy="${logoCy}" r="${logoR}" fill="${BRAND_STRONG}" stroke="${SURFACE}" stroke-width="4" />
  <svg x="${logoCx - 18}" y="${logoCy - 18}" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="${SURFACE}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    ${STORE_ICON_PATHS.map((d) => `<path d="${d}" />`).join("\n    ")}
  </svg>

  <text x="${size / 2}" y="${qrCardY + qrCard + 40}" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="${INK}">Scan &amp; Isi Data — Gratis</text>
  <text x="${size / 2}" y="${qrCardY + qrCard + 64}" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" fill="${INK_MUTED}">Tanpa kartu kredit • 100% harga jual milikmu</text>
</svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
